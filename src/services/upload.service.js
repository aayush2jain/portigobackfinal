const { Readable } = require("stream");

const cloudinary = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");

const ensureCloudinaryConfigured = () => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new ApiError(500, "Cloudinary is not configured");
  }
};

const buildOptimizedUrl = (publicId, transformation = []) =>
  cloudinary.url(publicId, {
    secure: true,
    transformation: [{ fetch_format: "auto" }, { quality: "auto" }, ...transformation]
  });

// Uploads an in-memory Multer file buffer to Cloudinary.
const uploadImageBuffer = async (file, folder = "portigo/uploads") => {
  ensureCloudinaryConfigured();

  if (!file?.buffer) {
    throw new ApiError(400, "No upload file provided");
  }

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ fetch_format: "auto" }, { quality: "auto" }]
      },
      (error, uploadResult) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(uploadResult);
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });

  return {
    url: result.secure_url,
    optimizedUrl: buildOptimizedUrl(result.public_id),
    thumbnailUrl: buildOptimizedUrl(result.public_id, [{ width: 600, crop: "limit" }]),
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes
  };
};

const deleteCloudinaryAsset = async (publicId) => {
  ensureCloudinaryConfigured();

  if (!publicId) {
    throw new ApiError(400, "Cloudinary publicId is required");
  }

  return cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};

module.exports = {
  uploadImageBuffer,
  deleteCloudinaryAsset,
  buildOptimizedUrl
};
