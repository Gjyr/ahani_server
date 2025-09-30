class ChatError extends Error {
  constructor(message, context = {}, originalError = null) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.context = context;
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ChatHistoryError extends ChatError {
  constructor(message, filename, operation, originalError = null) {
    super(message, { filename, operation }, originalError);
  }
}

class DeepSeekAPIError extends ChatError {
  constructor(message, statusCode, requestBody, originalError = null) {
    super(message, { statusCode, requestBody }, originalError);
  }
}

class StreamProcessingError extends ChatError {
  constructor(message, streamName, chunkInfo, originalError = null) {
    super(message, { streamName, chunkInfo }, originalError);
  }
}

class ValidationError extends ChatError {
  constructor(message, field, value, originalError = null) {
    super(message, { field, value }, originalError);
  }
}

class RequestBodyError extends ChatError {
  constructor(message, context = {}, originalError = null) {
    super(message, context, originalError);
    this.name = "RequestBodyError";
    this.httpStatus = 400;
  }
}

class PayloadTooLargeError extends RequestBodyError {
  constructor(maxSize, actualSize, originalError = null) {
    super(
      `Request body too large: ${actualSize} bytes exceeds maximum ${maxSize} bytes`,
      { maxSize, actualSize },
      originalError
    );
    this.httpStatus = 413;
  }
}

class InvalidJSONError extends RequestBodyError {
  constructor(body, position, originalError = null) {
    super(
      "Invalid JSON in request body",
      {
        bodyPreview: body.substring(0, 100),
        position,
      },
      originalError
    );
  }
}

export {
  ChatError,
  ChatHistoryError,
  DeepSeekAPIError,
  StreamProcessingError,
  ValidationError,
  RequestBodyError,
  PayloadTooLargeError,
  InvalidJSONError,
};
