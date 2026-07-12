// ─── STEP 24: VALIDATION RESULT HANDLER ───────────────────────────────────────
// express-validator ke validators sirf errors collect karte hain — yeh middleware
// unhe check karke, agar koi error hai, ek consistent 400 response bhejta hai.
// Har validated route mein chain ke last step pe yeh middleware lagana hai.
import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  // Pehli error ko top-level `error` mein bhejte hain (frontend ke existing
  // error-toast pattern ke saath compatible — wahan res.data.error string expect
  // hota hai), aur poori list `errors` array mein bhi rakhte hain for forms
  // jo field-level errors dikhana chahte hain.
  const formatted = errors.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  res.status(400).json({
    ok: false,
    error: formatted[0]?.message || 'Invalid input',
    errors: formatted,
  });
};
