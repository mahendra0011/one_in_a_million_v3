export function logError(err, req) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    method: req?.method,
    url: req?.originalUrl,
    ip: req?.ip,
    userId: req?.user?.id || null,
    errorName: err?.name,
    errorMessage: err?.message,
    errorCode: err?.code,
  };
  if (process.env.NODE_ENV !== 'production') {
    entry.stack = err?.stack;
  }
  if (process.env.NODE_ENV === 'production') {
    process.stderr.write(JSON.stringify(entry) + '\n');
  } else {
    console.error('[Error]', JSON.stringify(entry, null, 2));
  }
}

function handleDuplicateKeyError(err) {
  const field = Object.keys(err.keyPattern || {})[0] || 'field';
  const value = err.keyValue?.[field];
  const message = value ? `'${value}' is already taken for ${field}. Please use a different value.` : `Duplicate value for ${field}. Please use a different value.`;
  return { status: 409, message };
}

function handleValidationError(err) {
  const messages = Object.values(err.errors).map(e => e.message);
  return { status: 400, message: messages.join('. ') };
}

function handleJwtError(err) {
  if (err.name === 'TokenExpiredError') return { status: 401, message: 'Session expired. Please log in again.' };
  if (err.name === 'JsonWebTokenError') return { status: 401, message: 'Invalid token. Please log in again.' };
  if (err.name === 'NotBeforeError') return { status: 401, message: 'Token not yet active.' };
  return null;
}

function handleRateLimitError(err) {
  if (err?.status === 429 || err?.statusCode === 429) {
    return { status: 429, message: err.message || 'Too many requests. Please slow down and try again later.' };
  }
  return null;
}

export function globalErrorHandler(err, req, res, next) {
  logError(err, req);
  if (err?.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ ok: false, error: 'CSRF token invalid or expired. Refresh the page and try again.' });
  }
  if (err?.code === 'LIMIT_FILE_SIZE' || err?.message?.toLowerCase().includes('file size limit') || err?.message?.toLowerCase().includes('maxfilesize') || err?.message?.toLowerCase().includes('too large')) {
    return res.status(413).json({ ok: false, error: 'File is too large. Maximum allowed size is 5 MB.' });
  }
  if (err?.message?.toLowerCase().includes('multipart')) {
    return res.status(400).json({ ok: false, error: 'Invalid multipart/form-data upload.' });
  }
  if (err?.type === 'entity.parse.failed' || (err?.status === 400 && err?.body !== undefined)) {
    return res.status(400).json({ ok: false, error: 'Invalid JSON in request body.' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'Request body is too large.' });
  }
  const rateLimitResult = handleRateLimitError(err);
  if (rateLimitResult) {
    return res.status(rateLimitResult.status).json({ ok: false, error: rateLimitResult.message });
  }
  const jwtResult = handleJwtError(err);
  if (jwtResult) {
    return res.status(jwtResult.status).json({ ok: false, error: jwtResult.message });
  }
  if (err.name === 'ValidationError') {
    const { status, message } = handleValidationError(err);
    return res.status(status).json({ ok: false, error: message });
  }
  if (err.code === 11000) {
    const { status, message } = handleDuplicateKeyError(err);
    return res.status(status).json({ ok: false, error: message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ ok: false, error: `Invalid value for field '${err.path}'` });
  }
  const statusCode = err?.status || err?.statusCode;
  if (statusCode && statusCode >= 400 && statusCode < 600) {
    return res.status(statusCode).json({ ok: false, error: err.message || 'Request failed' });
  }
  res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
}