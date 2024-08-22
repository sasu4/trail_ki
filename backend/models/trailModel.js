import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['single', 'multiple', 'short-answer']
    },
    answers: [{
        text: { type: String, required: true},
        isCorrect: { type: Boolean, required: true}
    }]
});

const poiSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    longitude: {
        type: Number,
        required: true,
    },
    latitude: {
        type: Number,
        required: true,
    },
    quiz: quizSchema,
});

const trailSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        points: [poiSchema],
    }
);

export const Trail = mongoose.model('Trail', trailSchema);