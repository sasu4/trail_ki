import express from 'express';
import { Trail } from '../models/trailModel.js';

const router = express.Router();

// Route to Save a new Trail
router.post('/', async (request, response) => {
    try {
        const { name, points } = request.body;
        const newTrail = new Trail({name, points});
        await newTrail.save();
        return response.status(201).send(newTrail);
    } catch(error) {
        console.log(error.message);
        response.status(500).send({message: error.message});
    }
});

// Route to get all trails from DB
router.get('/', async(request, response) => {
    try {
        const trails = await Trail.find({});
        return response.status(201).send({
            count: trails.length,
            data: trails
        });
    } catch(error) {
        console.log(error.message);
        response.status(500).send({message: error.message});
    }
});

// Route to get one trail from DB by ID
router.get('/:id', async(request, response) => {
    try {
        const {id} = request.params;
        const trail = await Trail.findById(id);
        return response.status(201).send(trail);
    } catch(error) {
        console.log(error.message);
        response.status(500).send({message: error.message});
    }
});

// Route to Update a trail
router.put('/:id', async (request, response) => {
    try {
        const { name, points } = request.body;

        if (!name || !Array.isArray(points) || points.length === 0) {
            return response.status(400).send({
                message: 'Send all required fields: name and points array (with title, longitude, latitude)',
            });
        }

        for (let point of points) {
            if (!point.title || !point.longitude || !point.latitude) {
                return response.status(400).send({
                    message: 'Each point must have a title, longitude, and latitude',
                });
            }
        }

        const { id } = request.params;
        const updatedTrail = await Trail.findByIdAndUpdate(
            id,
            { name, points },
            { new: true }
        );

        if (!updatedTrail) {
            return response.status(404).send({
                message: 'Trail not found',
            });
        }

        response.status(200).send({
            message: 'Trail updated.',
            trail: updatedTrail,
        });
    } catch (error) {
        console.log(error.message);
        response.status(500).send({ message: error.message });
    }
});

// Route for Delete a trail
router.delete('/:id', async(request, response) => {
    try {
        const {id} = request.params;
        const result = await Trail.findByIdAndDelete(id);
        if(!result) {
            return response.status(400).send({
                message: 'Trail not found',
            });
        }
        response.status(200).send({message: 'Trail deleted successfully.'});
    } catch(error) {
        console.log(error.message);
        response.status(500).send({message: error.message});
    }
})

// Route for Delete a point of the trail
router.delete('/point/:trailId/:pointId', async (request, response) => {
    const { trailId, pointId } = request.params;

    try {
        const trail = await Trail.findById(trailId);
        if (!trail) {
            return response.status(404).send({ message: 'Trail not found' });
        }
        const updatedPoints = trail.points.filter(point => point._id.toString() !== pointId);

        trail.points = updatedPoints;
        await trail.save();

        response.status(200).send({ message: 'Point deleted successfully.', trail: trail });
    } catch (error) {
        console.log(error.message);
        response.status(500).send({ message: error.message });
    }
});

export default router;