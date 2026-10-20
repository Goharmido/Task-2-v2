import mongoose from 'mongoose';
import { Review } from '../models/Review.js';

export async function createReview(req, res, next) {
  try {
    const { mealCode, rating, comment, reviewedBy } = req.body ?? {};
    const review = await Review.create({ mealCode, rating, comment, reviewedBy });
    res.status(201).json({ review });
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This user already reviewed this meal' });
    }
    next(err);
  }
}

export async function getAllReviews(req, res, next) {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.status(200).json({ reviews });
  } catch (err) {
    next(err);
  }
}

export async function getReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid review id' });
    }
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.status(200).json({ review });
  } catch (err) {
    next(err);
  }
}

export async function getPopularMeals(req, res, next) {
  try {
    let minReviews = 2;
    if (req.query.minReviews !== undefined) {
      const raw = req.query.minReviews;
      if (typeof raw !== 'string' || !/^\d+$/.test(raw) || Number(raw) < 1) {
        return res
          .status(400)
          .json({ message: 'minReviews must be a positive integer' });
      }
      minReviews = Number(raw);
    }

    const popular = await Review.aggregate([
      {
        $group: {
          _id: '$mealCode',
          reviewCount: { $sum: 1 },
          averageRating: { $avg: '$rating' },
        },
      },
      { $match: { reviewCount: { $gte: minReviews } } },
      { $sort: { reviewCount: -1, _id: 1 } },
      {
        $project: {
          _id: 0,
          mealCode: '$_id',
          reviewCount: 1,
          averageRating: 1,
        },
      },
    ]);

    res.status(200).json({ popular });
  } catch (err) {
    next(err);
  }
}