class ApiResponse {
  constructor(statusCode = 200, message = "Success", data = {}) {
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }
}

module.exports = ApiResponse;
