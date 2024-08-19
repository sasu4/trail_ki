import mongoose from 'mongoose';

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
    }
});

const trailSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        points: [poiSchema],
    }
);

export const Trail = mongoose.model('Trail', trailSchema);