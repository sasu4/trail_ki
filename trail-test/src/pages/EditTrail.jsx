import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import BackButton from '../../components/BackButton';
import Spinner from '../../components/Spinner';
import { useNavigate, useParams } from 'react-router-dom';
import {MdOutlineDelete} from 'react-icons/md';

// openlayers components
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer } from 'ol/layer';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Modify } from 'ol/interaction';


const EditTrail = () => {
    const [name, setName] = useState('');
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const mapRef = useRef(null);
    const vectorSourceRef = useRef(new VectorSource());  // reference for the vector source (points & lines)
    const navigate = useNavigate();
    const {id} = useParams();
    const mapInstanceRef = useRef(null); // storage of mapinstance

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        axios.get(`http://localhost:5555/trails/${id}`)
        .then((response) => {
            setName(response.data.name);
            setPoints(response.data.points || []);
            loadExistingPoints(response.data.points || []);
            setLoading(false);
        }).catch((error) => {
            setLoading(false);
            alert('Failed to load trail.');
            console.log(error);
        });
    }, [id]);

    const handleEditTrail = () => {
        const data = {
            name,
            points
        };
        setLoading(true);
        axios.put(`http://localhost:5555/trails/${id}`, data)
        .then(() => {
            setLoading(false);
            setSuccessMessage('Trail updated.');
            setTimeout(() => {
                navigate('/');
            }, 2000);
        })
        .catch((error) => {
            setLoading(false);
            console.log('Server response data:', data);
            if (error.response) {
                console.log('Server responded with status code:', error.response.status);
                console.log('Server response data:', error.response.data);
            } else {
                console.log('Error:', error.message);
            }
        });
    };

    useEffect(() => {
        // Initialize the map once (not every time the points state changes)
        if (mapInstanceRef.current || !mapRef.current) return;  

        const vectorLayer = new VectorLayer({
            source: vectorSourceRef.current,  
        });

        const map = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                vectorLayer,
            ],
            view: new View({
                center: fromLonLat([0, 0]),  // default location - maybe could be changed to something different
                zoom: 2,  // initial zoom level
            }),
        });

        mapInstanceRef.current = map; // store map for later usage

        // Add click event listener to the map
        map.on('click', function (evt) {
            const coordinates = evt.coordinate;  // Get clicked coordinates
            const lonLat = toLonLat(coordinates);  
            const title = prompt('Enter the title for this point:');
            if (title) {
                const point = {
                    title: title,
                    longitude: lonLat[0], 
                    latitude: lonLat[1]    
                };

                // Update the points state
                setPoints(prevPoints => [...prevPoints, point]);
                addPointToMap(point);
                drawTrail([...points, point]);
            }
        });

        // point movement if you want to edit the placement
        const modify = new Modify({ source: vectorSourceRef.current });
        map.addInteraction(modify);
        modify.on('modifyend', (evt) => {            
            evt.features.forEach(feature => {
                const newCoords = toLonLat(feature.getGeometry().getCoordinates());
                const featureId = feature.getId();
                console.log('featureID', featureId);
                
                setPoints(currentPoints => currentPoints.map(point => {
                    if (String(point._id) === featureId) { 
                        return { ...point, longitude: newCoords[0], latitude: newCoords[1] };
                    }
                    return point;
                }));
            });
        });

        // remove points on right-click - does not work yet
        /*map.on('contextmenu', function(evt) {
            evt.preventDefault();
            const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
                // it took also lines so lets try to get only a point
                if (feature.getGeometry() instanceof Point) {
                    return feature;
                }
            });
            
            console.log("Feature ID on right-click:", feature);
            if(feature) {
                const featureId = feature.getId();
                console.log('feature delete', featureId);
                if (featureId && window.confirm('Do you want to delete this point?')) {
                    vectorSourceRef.current.removeFeature(feature); // Remove from map
                    setPoints(currentPoints => currentPoints.filter(p => String(p._id) !== featureId));
                }
                // not working either
                /*if(window.confirm('Do you want to delete this point?')) {
                    console.log('feature delete', featureId);

                    /*
                    const updatedPoints = points.filter(p => String(p._id) !== feature.getId());
                    if (updatedPoints.length === 0) {
                        // Handle potential issues when all points are removed
                        alert('No points left on the trail.');
                    }
                    setPoints(updatedPoints);
                    const featureId = feature.getId();
                    vectorSourceRef.current.removeFeature(feature);
                    const updatedPoints = points.filter((p) => String(p._id) !== featureId);
                    setPoints(updatedPoints);
                    drawTrail(updatedPoints);
                //}
            }
        });*/
    }, []); 

    // function to delete the point
    const deletePoint = async (trailId, pointId) => {
        if (window.confirm('Are you sure you want to delete this point?')) {
            try {
                const response = await axios.delete(`http://localhost:5555/trails/point/${trailId}/${pointId}`);
                if (response.status === 200) {
                    alert('Point deleted successfully!');
                    setPoints(points => {
                        const updatedPoints = points.filter(point => point._id !== pointId);
                        // Remove the feature from the map
                        const featureToRemove = vectorSourceRef.current.getFeatureById(pointId);
                        if (featureToRemove) {
                            vectorSourceRef.current.removeFeature(featureToRemove);
                        }
                        // Redraw the trail with remaining points
                        drawTrail(updatedPoints);
                        return updatedPoints;
                    });
                }
            } catch (error) {
                console.error('Failed to delete the point:', error);
                alert('Failed to delete the point.');
            }
        }
    };

    // function to load existing points to the map
    const loadExistingPoints = (trailPoints) => {
        vectorSourceRef.current.clear();
        trailPoints.forEach(p => { addPointToMap(p); });
        drawTrail(trailPoints);
        // zoom to the first point on trail
        if(trailPoints.length > 0) {
            const firstPoint = trailPoints[0];
            const firstPointCoords = fromLonLat([firstPoint.longitude, firstPoint.latitude]);
            mapInstanceRef.current.getView().setCenter(firstPointCoords);
            mapInstanceRef.current.getView().setZoom(14); 
        }
    };

    // function to add point to the map
    const addPointToMap = (point) => {
        const pointFeature = new Feature({
            geometry: new Point(fromLonLat([point.longitude, point.latitude])),
        });
        pointFeature.setId(String(point._id));
        pointFeature.setStyle(new Style({
            image: new CircleStyle({
                radius: 6,
                fill: new Fill({color: 'blue'}),
                stroke: new Stroke({color: 'white', width: 2}),
            }),
        }));
        vectorSourceRef.current.addFeature(pointFeature);
    };

    // function to draw the trail line by connecting points
    const drawTrail = (trailPoints) => {
        // remove existing line features to prevent duplicates
        const features = vectorSourceRef.current.getFeatures();
        features.forEach(feature => {
            if (feature.getGeometry() instanceof LineString) {
                vectorSourceRef.current.removeFeature(feature);
            }
        });

        if (trailPoints.length > 1) {
            const lineCoordinates = trailPoints.map(p => fromLonLat([p.longitude, p.latitude]));
            const lineFeature = new Feature({
                geometry: new LineString(lineCoordinates),
            });
            lineFeature.setStyle(new Style({
                stroke: new Stroke({
                    color: 'green',
                    width: 2,
                })
            }));
            vectorSourceRef.current.addFeature(lineFeature);
        }
    };


    return (
        <div className='p-4'>
            <BackButton></BackButton>
            <h1 className='text-3xl my-4'>Edit Trail</h1>
            { loading ? <Spinner /> : ''}
            <div className='flex flex-col'>
                {successMessage && (
                    <div className='bg-green-100 border-t border-b border-green-500 text-green-700 px-4 py-3'>
                        <p>{successMessage}</p>
                    </div>
                )}
                <div className='my-4'>
                    <label className='text-xl mr-4 text-gray-500'>Name</label>
                    <input type='text' value={name} onChange={(e) => setName(e.target.value)} className='border-2 border-gray-500 px-4'></input>
                </div>
                <div className='my-4'>
                    <label className='text-xl mr-4 text-gray-500'>Points</label>
                    {points && points.length > 0 ? (
                        <ul>
                        {points.map((point, idx) => (
                            <li key={point._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                <span>{`Point ${idx + 1}: ${point.title} (${point.longitude.toFixed(2)}, ${point.latitude.toFixed(2)})`}</span>
                                <button onClick={() => deletePoint(id, point._id)} style={{ marginLeft: '10px' }}>
                                    <MdOutlineDelete className='text-2xl text-red-600' />
                                </button>
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <span>No Points</span>
                    )}
                </div>
                <div className='my-4'>
                    <label className='text-xl mr-4 text-gray-500'>Map - Click to Add Points</label>
                    {/* Map container */}
                    <div ref={mapRef} className='w-full h-96 border-2 border-gray-300' />
                </div>
            
                <button className='p-2 bg-sky-300 m-8' onClick={handleEditTrail}>
                    Save
                </button>
            </div>
        </div>
    )
};

export default EditTrail;