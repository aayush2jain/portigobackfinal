const multer = require("multer");

const ApiError = require("../utils/ApiError");

const storage = multer.memoryStorage();

const imageFileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new ApiError(400, "Only image uploads are allowed"));
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10
  }
});

module.exports = upload;
