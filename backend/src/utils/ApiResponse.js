class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.success    = statusCode < 400;
    this.message    = message;
    this.data       = data;
  }

  static ok(res, data, message)      { return res.status(200).json(new ApiResponse(200, data, message)); }
  static created(res, data, message) { return res.status(201).json(new ApiResponse(201, data, message)); }
  static noContent(res)              { return res.status(204).send(); }
}

export default ApiResponse;
