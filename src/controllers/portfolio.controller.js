const CreatorProfile = require("../models/CreatorProfile");
const Portfolio = require("../models/Portfolio");
const { deleteCloudinaryAsset, uploadImageBuffer } = require("../services/upload.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const catchAsync = require("../utils/catchAsync");

const sendResponse = (res, statusCode, message, data = {}) =>
  res.status(statusCode).json(new ApiResponse(statusCode, message, data));

const canManagePortfolio = async (portfolio, user) => {
  if (user.role === "admin") {
    return true;
  }

  const profile = await CreatorProfile.findOne({ user: user._id });
  return profile && portfolio.creator.toString() === profile._id.toString();
};

// Creates a portfolio item for the authenticated creator.
const createPortfolio = catchAsync(async (req, res) => {
  const portfolio = await Portfolio.create({
    creator: req.creatorProfile._id,
    title: req.body.title,
    description: req.body.description,
    tags: req.body.tags,
    projectUrl: req.body.projectUrl,
    images: req.body.images || []
  });

  sendResponse(res, 201, "Portfolio item created successfully", { portfolio });
});

// Returns portfolio items owned by the authenticated creator.
const getMyPortfolio = catchAsync(async (req, res) => {
  const portfolio = await Portfolio.find({ creator: req.creatorProfile._id }).sort({ createdAt: -1 });

  sendResponse(res, 200, "Portfolio fetched successfully", { portfolio });
});

// Returns public portfolio items for a published creator.
const getPublicCreatorPortfolio = catchAsync(async (req, res) => {
  const creator = await CreatorProfile.findOne({ _id: req.params.creatorId, isPublished: true });

  if (!creator) {
    throw new ApiError(404, "Creator profile not found");
  }

  const portfolio = await Portfolio.find({ creator: creator._id }).sort({ createdAt: -1 });

  sendResponse(res, 200, "Portfolio fetched successfully", { portfolio });
});

// Updates a portfolio item.
const updatePortfolio = catchAsync(async (req, res) => {
  const portfolio = await Portfolio.findById(req.params.id);

  if (!portfolio) {
    throw new ApiError(404, "Portfolio item not found");
  }

  if (!(await canManagePortfolio(portfolio, req.user))) {
    throw new ApiError(403, "You cannot manage this portfolio item");
  }

  ["title", "description", "tags", "projectUrl"].forEach((field) => {
    if (req.body[field] !== undefined) {
      portfolio[field] = req.body[field];
    }
  });

  await portfolio.save();

  sendResponse(res, 200, "Portfolio item updated successfully", { portfolio });
});

// Deletes a portfolio item and attempts to remove its Cloudinary assets.
const deletePortfolio = catchAsync(async (req, res) => {
  const portfolio = await Portfolio.findById(req.params.id);

  if (!portfolio) {
    throw new ApiError(404, "Portfolio item not found");
  }

  if (!(await canManagePortfolio(portfolio, req.user))) {
    throw new ApiError(403, "You cannot manage this portfolio item");
  }

  await Promise.all(
    portfolio.images.map((image) =>
      deleteCloudinaryAsset(image.publicId).catch((error) =>
        console.error(`Cloudinary delete failed for ${image.publicId}`, error)
      )
    )
  );

  await portfolio.deleteOne();

  sendResponse(res, 200, "Portfolio item deleted successfully");
});

// Uploads images to Cloudinary and attaches them to a portfolio item.
const addPortfolioImages = catchAsync(async (req, res) => {
  const portfolio = await Portfolio.findById(req.params.id);

  if (!portfolio) {
    throw new ApiError(404, "Portfolio item not found");
  }

  if (!(await canManagePortfolio(portfolio, req.user))) {
    throw new ApiError(403, "You cannot manage this portfolio item");
  }

  const files = req.files || [];

  if (!files.length) {
    throw new ApiError(400, "At least one image file is required");
  }

  const uploadedImages = await Promise.all(
    files.map((file) => uploadImageBuffer(file, `portigo/portfolio/${portfolio.creator}`))
  );

  portfolio.images.push(
    ...uploadedImages.map((image) => ({
      url: image.url,
      optimizedUrl: image.optimizedUrl,
      thumbnailUrl: image.thumbnailUrl,
      publicId: image.publicId,
      alt: req.body.alt || ""
    }))
  );

  await portfolio.save();

  sendResponse(res, 200, "Portfolio images uploaded successfully", { portfolio });
});

// Removes one image from a portfolio item and Cloudinary.
const deletePortfolioImage = catchAsync(async (req, res) => {
  const { publicId } = req.body;
  const portfolio = await Portfolio.findById(req.params.id);

  if (!portfolio) {
    throw new ApiError(404, "Portfolio item not found");
  }

  if (!(await canManagePortfolio(portfolio, req.user))) {
    throw new ApiError(403, "You cannot manage this portfolio item");
  }

  const imageExists = portfolio.images.some((image) => image.publicId === publicId);

  if (!imageExists) {
    throw new ApiError(404, "Image not found on this portfolio item");
  }

  await deleteCloudinaryAsset(publicId);
  portfolio.images = portfolio.images.filter((image) => image.publicId !== publicId);
  await portfolio.save();

  sendResponse(res, 200, "Portfolio image deleted successfully", { portfolio });
});

module.exports = {
  createPortfolio,
  getMyPortfolio,
  getPublicCreatorPortfolio,
  updatePortfolio,
  deletePortfolio,
  addPortfolioImages,
  deletePortfolioImage
};
