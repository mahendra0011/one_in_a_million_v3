// ─── STEP 24: INPUT VALIDATION CHAINS ─────────────────────────────────────────
// Har route ke liye express-validator chains. Naming convention:
//   v<RouteGroup><Action>  e.g. vAuthLogin, vMenuCreate
// Har chain `validate` middleware (middleware/validate.js) ke saath route mein
// lagai jaati hai: app.post('/path', vSomething, validate, handler)
import { body, param, query } from 'express-validator';
import bcrypt from 'bcryptjs';

const MONGO_ID = /^[0-9a-fA-F]{24}$/;

const isMongoId = (field, location = body) =>
  location(field).matches(MONGO_ID).withMessage(`${field} must be a valid id`);

// ─── AUTH ──────────────────────────────────────────────────────────────────────
export const vRegisterSendEmailOtp = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('name').optional().trim().isLength({ max: 80 }),
];

const passwordStrength = (value) => {
  if (!value) return false;
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
};

export { passwordStrength };

export const vLegacyRegister = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').custom(passwordStrength).withMessage('Password must be 8+ chars with uppercase, lowercase, number and special character'),
  body('phone').optional({ checkFalsy: true }).trim(),
];

export const vUpdateProfile = [
  body('name').optional().trim().isLength({ min: 1, max: 80 }),
  body('phone').optional().trim().matches(/^\+?[0-9]{7,15}$/).withMessage('Enter a valid phone number'),
  body('savedAddresses').optional().isArray().withMessage('savedAddresses must be an array'),
];

export const vForgotPassword = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email').normalizeEmail(),
];

export const vVerifyResetOtp = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('otp').trim().notEmpty().withMessage('OTP is required').isLength({ min: 4, max: 8 }).isNumeric(),
];

export const vResetPassword = [
  body('resetToken').notEmpty().withMessage('resetToken is required'),
  body('newPassword').notEmpty().withMessage('New password is required').custom(passwordStrength).withMessage('Password must be 8+ chars with uppercase, lowercase, number and special character'),
];

// ─── UNIFIED LOGIN ───────────────────────────────────────────────────────────────
export const vUnifiedLoginSendOtp = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const vUnifiedLoginVerifyOtp = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('otp').trim().notEmpty().withMessage('OTP is required').isLength({ min: 4, max: 8 }).isNumeric(),
  body('loginToken').notEmpty().withMessage('loginToken is required'),
];

// ─── DELIVERY AUTH / MANAGEMENT ────────────────────────────────────────────────
export const vDeliveryLogin = [
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const vDeliverySetPassword = [
  body('currentPassword').optional({ checkFalsy: true }).isString(),
  body('newPassword').notEmpty().withMessage('New password is required').custom(passwordStrength).withMessage('New password must be 8+ chars with uppercase, lowercase, number and special character'),
];

export const vAdminCreateDeliveryBoy = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('phone').trim().notEmpty().withMessage('Phone is required').matches(/^\+?[0-9]{7,15}$/).withMessage('Enter a valid phone number'),
  body('password').notEmpty().withMessage('Password is required').custom(passwordStrength).withMessage('Password must be 8+ chars with uppercase, lowercase, number and special character'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('vehicleType').optional().trim().isLength({ max: 40 }),
  body('vehicleNumber').optional().trim().isLength({ max: 20 }),
];

export const vAdminUpdateDeliveryBoy = [
  isMongoId('id', param),
  body('name').optional().trim().isLength({ min: 1, max: 80 }),
  body('phone').optional().trim().matches(/^\+?[0-9]{7,15}$/).withMessage('Enter a valid phone number'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('vehicleType').optional().trim().isLength({ max: 40 }),
  body('vehicleNumber').optional().trim().isLength({ max: 20 }),
];

// ─── DELIVERY BOY ORDER ACTIONS ────────────────────────────────────────────────
export const vDeliveryOrderIdParam = [
  param('orderId').trim().notEmpty().withMessage('orderId is required'),
];

export const vDeliveryAccept = [
  param('orderId').trim().notEmpty().withMessage('orderId is required'),
  body('lat').notEmpty().withMessage('lat is required').isFloat({ min: -90, max: 90 }).withMessage('lat must be between -90 and 90'),
  body('lng').notEmpty().withMessage('lng is required').isFloat({ min: -180, max: 180 }).withMessage('lng must be between -180 and 180'),
];

export const vDeliveryLocation = [
  param('orderId').trim().notEmpty().withMessage('orderId is required'),
  body('lat').notEmpty().withMessage('lat is required').isFloat({ min: -90, max: 90 }).withMessage('lat must be between -90 and 90'),
  body('lng').notEmpty().withMessage('lng is required').isFloat({ min: -180, max: 180 }).withMessage('lng must be between -180 and 180'),
];

export const vDeliveryOrderStatus = [
  param('orderId').trim().notEmpty().withMessage('orderId is required'),
  body('status').trim().notEmpty().withMessage('status is required')
    .isIn(['pending', 'confirmed', 'preparing', 'reached_restaurant', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'])
    .withMessage('Invalid status value'),
];

export const vDeliveryRejectOrder = [
  param('orderId').trim().notEmpty().withMessage('orderId is required'),
  body('reason').trim().notEmpty().withMessage('Reject reason is required').isLength({ max: 200 }),
];

export const vDeliveryVerifyOtp = [
  param('orderId').trim().notEmpty().withMessage('orderId is required'),
  body('otp').trim().notEmpty().withMessage('OTP is required').isLength({ min: 4, max: 8 }).isNumeric(),
];

export const vDeliveryOnlineStatus = [
  body('isOnline').isBoolean().withMessage('isOnline must be boolean'),
];

// ─── MENU ──────────────────────────────────────────────────────────────────────
export const vMenuQuery = [
  query('category').optional().trim().isLength({ max: 60 }),
  query('subcat').optional().trim().isLength({ max: 60 }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('veg').optional().isIn(['true', 'false']),
  query('spicy').optional().isIn(['true', 'false']),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be a positive number'),
  query('sort').optional().isIn(['price-asc', 'price-desc', 'name']),
];

export const vMenuAllQuery = [
  query('category').optional().trim().isLength({ max: 60 }),
  query('search').optional().trim().isLength({ max: 100 }),
];

export const vMenuCreate = [
  body('id').trim().notEmpty().withMessage('id is required'),
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 120 }),
  body('category').trim().notEmpty().withMessage('category is required'),
  body('price').notEmpty().withMessage('price is required').isFloat({ min: 0 }).withMessage('price must be a positive number'),
  body('subcat').optional().trim(),
  body('image').optional({ checkFalsy: true }).isURL().withMessage('image must be a valid URL'),
  body('badge').optional().trim(),
  body('spicy').optional().isBoolean(),
  body('veg').optional().isBoolean(),
  body('desc').optional().trim().isLength({ max: 500 }),
  body('available').optional().isBoolean(),
];

export const vMenuUpdate = [
  param('id').trim().notEmpty().withMessage('id is required'),
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('category').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }).withMessage('price must be a positive number'),
  body('subcat').optional().trim(),
  body('image').optional({ checkFalsy: true }).isURL().withMessage('image must be a valid URL'),
  body('badge').optional().trim(),
  body('spicy').optional().isBoolean(),
  body('veg').optional().isBoolean(),
  body('desc').optional().trim().isLength({ max: 500 }),
  body('available').optional().isBoolean(),
];

export const vMenuIdParam = [
  param('id').trim().notEmpty().withMessage('id is required'),
];

// ─── ORDERS ────────────────────────────────────────────────────────────────────
export const vCreateOrder = [
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('totals').isObject().withMessage('totals is required'),
  body('totals.total').notEmpty().withMessage('totals.total is required').isFloat({ min: 0 }).withMessage('totals.total must be a positive number'),
  body('customer').isObject().withMessage('customer is required'),
  body('customer.name').optional().trim().isLength({ max: 80 }),
  body('customer.phone').optional().trim(),
  body('fulfillment').optional().isIn(['delivery', 'pickup', 'dine-in']).withMessage('Invalid fulfillment type'),
  body('payment').optional().trim(),
];

export const vOrdersListQuery = [
  query('status').optional().isIn(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

export const vOrderIdParam = [
  param('id').trim().notEmpty().withMessage('Order id is required'),
];

export const vOrderUpdateStatus = [
  param('id').trim().notEmpty().withMessage('Order id is required'),
  body('status').trim().notEmpty().withMessage('status is required')
    .isIn(['pending', 'confirmed', 'preparing', 'reached_restaurant', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'])
    .withMessage('Invalid status value'),
  body('assignedTo').optional({ checkFalsy: true }).matches(MONGO_ID).withMessage('assignedTo must be a valid id'),
];

export const vOrderAssign = [
  param('id').trim().notEmpty().withMessage('Order id is required'),
  body('deliveryBoyId').notEmpty().withMessage('deliveryBoyId is required').matches(MONGO_ID).withMessage('deliveryBoyId must be a valid id'),
];

// ─── RESERVATIONS ──────────────────────────────────────────────────────────────
export const vCreateReservation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required').matches(/^\+?[0-9]{7,15}$/).withMessage('Enter a valid phone number'),
  body('date').trim().notEmpty().withMessage('Date is required'),
  body('time').trim().notEmpty().withMessage('Time is required'),
  body('guests').optional().isInt({ min: 1, max: 50 }).withMessage('guests must be between 1 and 50'),
  body('occasion').optional().trim().isLength({ max: 60 }),
  body('requests').optional().trim().isLength({ max: 500 }),
];

export const vReservationsQuery = [
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled']),
  query('date').optional().trim(),
];

export const vUpdateReservation = [
  isMongoId('id', param),
  body('status').optional().isIn(['pending', 'confirmed', 'cancelled']).withMessage('Invalid status value'),
  body('tableNo').optional({ nullable: true }).isInt({ min: 0 }).withMessage('tableNo must be a positive integer'),
  body('guests').optional().isInt({ min: 1, max: 50 }).withMessage('guests must be between 1 and 50'),
];

// ─── COUPONS ───────────────────────────────────────────────────────────────────
export const vCreateCoupon = [
  body('code').trim().notEmpty().withMessage('Coupon code is required').isLength({ max: 30 }),
  body('discountType').optional().isIn(['percent', 'flat']).withMessage('discountType must be percent or flat'),
  body('discountValue').notEmpty().withMessage('discountValue is required').isFloat({ min: 0 }).withMessage('discountValue must be a positive number'),
  body('minOrder').optional().isFloat({ min: 0 }).withMessage('minOrder must be a positive number'),
  body('maxUses').optional({ nullable: true }).isInt({ min: 1 }).withMessage('maxUses must be a positive integer'),
  body('expiry').optional({ nullable: true }).isISO8601().withMessage('expiry must be a valid date'),
  body('isActive').optional().isBoolean(),
  body('userId').optional({ checkFalsy: true }).matches(MONGO_ID).withMessage('userId must be a valid id'),
];

export const vUpdateCoupon = [
  isMongoId('id', param),
  body('code').optional().trim().isLength({ min: 1, max: 30 }),
  body('discountType').optional().isIn(['percent', 'flat']).withMessage('discountType must be percent or flat'),
  body('discountValue').optional().isFloat({ min: 0 }).withMessage('discountValue must be a positive number'),
  body('minOrder').optional().isFloat({ min: 0 }).withMessage('minOrder must be a positive number'),
  body('maxUses').optional({ nullable: true }).isInt({ min: 1 }).withMessage('maxUses must be a positive integer'),
  body('expiry').optional({ nullable: true }).isISO8601().withMessage('expiry must be a valid date'),
  body('isActive').optional().isBoolean(),
];

export const vDeleteCoupon = [
  isMongoId('id', param),
];

export const vValidateCoupon = [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('orderTotal').notEmpty().withMessage('orderTotal is required').isFloat({ min: 0 }).withMessage('orderTotal must be a positive number'),
  body('userId').optional({ checkFalsy: true }).matches(MONGO_ID).withMessage('userId must be a valid id'),
];

// ─── REVIEWS ───────────────────────────────────────────────────────────────────
export const vReviewsQuery = [
  query('itemId').optional().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

export const vAdminUpdateCustomer = [
  isMongoId('id', param),
  body('isBanned').isBoolean().withMessage('isBanned must be boolean'),
];

export const vAdminUpdateLoyalty = [
  isMongoId('id', param),
  body('points').notEmpty().withMessage('points is required').isInt({ min: 1 }).withMessage('points must be a positive integer'),
];

export const vCreateReview = [
  body('orderId').trim().notEmpty().withMessage('orderId is required'),
  body('rating').notEmpty().withMessage('rating is required').isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5'),
  body('itemId').optional().trim(),
  body('comment').optional().trim().isLength({ max: 1000 }),
  body('photos').optional().isArray().withMessage('photos must be an array'),
];

export const vReviewVisibility = [
  isMongoId('id', param),
  body('isVisible').isBoolean().withMessage('isVisible must be boolean'),
];

export const vReviewIdParam = [
  isMongoId('id', param),
];

export const vAdminReviewsQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('visibility').optional().isIn(['visible', 'hidden']),
];

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────────
export const vNotificationIdParam = [
  isMongoId('id', param),
];



// ─── CART ──────────────────────────────────────────────────────────────────────
export const vSaveCart = [
  body('items').optional().isArray().withMessage('items must be an array'),
  body('coupon').optional().trim(),
  body('couponDiscount').optional().isFloat({ min: 0 }).withMessage('couponDiscount must be a positive number'),
  body('fulfillment').optional().isIn(['delivery', 'pickup', 'dine-in']).withMessage('Invalid fulfillment type'),
  body('deliveryAddress').optional().trim().isLength({ max: 300 }),
  body('deliveryCoords').optional({ nullable: true }).isObject(),
];

// ─── SETTINGS ──────────────────────────────────────────────────────────────────
export const vUpdateSettings = [
  body('restaurantName').optional().trim().isLength({ min: 1, max: 100 }),
  body('address').optional().trim().isLength({ min: 1, max: 300 }),
  body('phone').optional().trim().matches(/^\+?[0-9]{7,15}$/).withMessage('Enter a valid phone number'),
  body('openTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('openTime must be HH:mm'),
  body('closeTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('closeTime must be HH:mm'),
  body('deliveryRadius').optional().isFloat({ min: 0 }).withMessage('deliveryRadius must be a positive number'),
  body('deliveryCharge').optional().isFloat({ min: 0 }).withMessage('deliveryCharge must be a positive number'),
  body('minOrderAmount').optional().isFloat({ min: 0 }).withMessage('minOrderAmount must be a positive number'),
  body('isOpen').optional().isBoolean(),
];

export const vContactForm = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().matches(/^\+?[0-9]{7,15}$/).withMessage('Enter a valid phone number'),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 120 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 2000 }),
];

// ─── ADMIN SETUP ───────────────────────────────────────────────────────────────
export const vSetupAdmin = [
  body('secret').notEmpty().withMessage('secret is required'),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').custom(passwordStrength).withMessage('Password must be 8+ chars with uppercase, lowercase, number and special character'),
];

// ─── ROUTING / MAP MATCHING ─────────────────────────────────────────────
export const vGeocodeSearch = [
  query('q').trim().notEmpty().withMessage('query required').isLength({ min: 3 }),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('limit must be between 1 and 20'),
];

export const vORSRoute = [
  body('start.lat').notEmpty().withMessage('start.lat required').isFloat({ min: -90, max: 90 }),
  body('start.lng').notEmpty().withMessage('start.lng required').isFloat({ min: -180, max: 180 }),
  body('end.lat').notEmpty().withMessage('end.lat required').isFloat({ min: -90, max: 90 }),
  body('end.lng').notEmpty().withMessage('end.lng required').isFloat({ min: -180, max: 180 }),
];

export const vORSSnap = [
  body('coordinates').isArray({ min: 1 }).withMessage('coordinates array required (non-empty)'),
];

// ─── UPLOAD ────────────────────────────────────────────────────────────────────
// express-validator se file validation nahi hoti (multipart/form-data ka body
// parsed nahi hota iske through), lekin is validator ko route ke baad
// in-handler manual checks ke saath use karte hain for structural consistency.
// Actual file type + size checks handler mein hi rehte hain (mimetype/size).
// Yahan sirf ensure karte hain ki koi unexpected JSON body na aaye is route pe.
export const vUpload = [];
