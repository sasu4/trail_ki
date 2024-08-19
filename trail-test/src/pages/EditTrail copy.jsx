import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import BackButton from '../../components/BackButton';
import Spinner from '../../components/Spinner';
import { useNavigate, useParams } from 'react-router-dom';

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
import { Modify, Select } from 'ol/interaction';
import { click } from 'ol/events/condition';


const EditTrail = () => {
    const [name, setName] = useState('');
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const mapRef = useRef(null);
    const vectorSourceRef = useRef(new VectorSource());  // Reference for the vector source (points & lines)
    const navigate = useNavigate();
    const {id} = useParams();
    const selectedFeatureRef = useRef(null);
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
            //console.log('Server response data:', data);
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
        if (mapInstanceRef.current || !mapRef.current) return;  // Make sure mapRef is available

        const vectorLayer = new VectorLayer({
            source: vectorSourceRef.current,  // Attach the vector source to the vector layer
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
                center: fromLonLat([0, 0]),  // Set initial center to some default location
                zoom: 2,  // Set initial zoom level
            }),
        });

        mapInstanceRef.current = map; // store map for later usage

        // Add click event listener to the map
        map.on('click', function (evt) {
            const coordinates = evt.coordinate;  // Get clicked coordinates
            const lonLat = toLonLat(coordinates);  // Convert to lon/lat
            const title = prompt('Enter the title for this point:');
            if (title) {
                const point = {
                    title: title,
                    longitude: lonLat[0],  // Store longitude
                    latitude: lonLat[1]    // Store latitude
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
                // Using functional update to access the most recent state
                setPoints(currentPoints => currentPoints.map(point => {
                    if (String(point._id) === featureId) { // Ensure the IDs match and are compared correctly
                        return { ...point, longitude: newCoords[0], latitude: newCoords[1] };
                    }
                    return point;
                }));
            });
        });

        // remove points on right-click
        map.on('contextmenu', function(evt) {
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
                /*if(window.confirm('Do you want to delete this point?')) {
                    console.log('feature delete', featureId);

                    /*
                    const updatedPoints = points.filter(p => String(p._id) !== feature.getId());
                    if (updatedPoints.length === 0) {
                        // Handle potential issues when all points are removed
                        alert('No points left on the trail.');
                    }
                    setPoints(updatedPoints);
                    /*const featureId = feature.getId();
                    vectorSourceRef.current.removeFeature(feature);
                    const updatedPoints = points.filter((p) => String(p._id) !== featureId);
                    setPoints(updatedPoints);
                    drawTrail(updatedPoints);*/
                //}
            }
        });
    }, []); //tu bol points

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
        vectorSourceRef.current.getFeatures().forEach((feature) => {
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
                {/* Display success message */}
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