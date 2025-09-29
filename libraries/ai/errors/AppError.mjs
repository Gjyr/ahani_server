export class ChatError extends Error {
  constructor(message, context = {}, originalError = null) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.context = context;
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ChatHistoryError extends ChatError {
  constructor(message, filename, operation, originalError = null) {
    super(message, { filename, operation }, originalError);
  }
}

export class DeepSeekAPIError extends ChatError {
  constructor(message, statusCode, requestBody, originalError = null) {
    super(message, { statusCode, requestBody }, originalError);
  }
}

export class StreamProcessingError extends ChatError {
  constructor(message, streamName, chunkInfo, originalError = null) {
    super(message, { streamName, chunkInfo }, originalError);
  }
}

export class ValidationError extends ChatError {
  constructor(message, field, value, originalError = null) {
    super(message, { field, value }, originalError);
  }
}
