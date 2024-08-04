class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    // When the constructor is called, thisconstructor call will not
    // appear in the stack trace.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
