const { deleteCloudinaryAsset, uploadImageBuffer } = require("../services/upload.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const catchAsync = require("../utils/catchAsync");

const sendResponse = (res, statusCode, message, data = {}) =>
  res.status(statusCode).json(new ApiResponse(statusCode, message, data));

// Uploads one image to Cloudinary and returns optimized URLs.
const uploadSingle = catchAsync(async (req, res) => {
  const upload = await uploadImageBuffer(req.file, req.body.folder || "portigo/uploads");

  sendResponse(res, 201, "Image uploaded successfully", { upload });
});

// Uploads multiple images to Cloudinary and returns optimized URLs.
const uploadMultiple = catchAsync(async (req, res) => {
  if (!req.files?.length) {
    throw new ApiError(400, "At least one image file is required");
  }

  const uploads = await Promise.all(
    (req.files || []).map((file) => uploadImageBuffer(file, req.body.folder || "portigo/uploads"))
  );

  sendResponse(res, 201, "Images uploaded successfully", { uploads });
});

// Deletes a Cloudinary image by public id.
const deleteUpload = catchAsync(async (req, res) => {
  const result = await deleteCloudinaryAsset(req.body.publicId);

  sendResponse(res, 200, "Image deleted successfully", { result });
});

module.exports = {
  uploadSingle,
  uploadMultiple,
  deleteUpload
};
