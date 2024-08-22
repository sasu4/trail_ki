import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import BackButton from '../../components/BackButton';
import Spinner from '../../components/Spinner';
import PointModal from '../../components/PointModal';
import { useNavigate } from 'react-router-dom';
import {MdOutlineDelete} from 'react-icons/md';
import {AiOutlineEdit} from 'react-icons/ai';

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

const CreateTrail = () => {
    const [name, setName] = useState('');
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalKey, setModalKey] = useState(0); // re-rendering the modal
    const [tempPoint, setTempPoint] = useState(null);
    const mapRef = useRef(null);
    const vectorSourceRef = useRef(new VectorSource());  // Reference for the vector source (points & lines)
    const navigate = useNavigate();
    const [editMode, setEditMode] = useState(false); // because of the possibility to edit already created point
    const [currentPoint, setCurrentPoint] = useState(null);

    const handleSaveTrail = () => {
        const data = {
            name,
            points
        };
        setLoading(true);
        axios.post('http://localhost:5555/trails', data)
        .then(() => {
            setLoading(false);
            setSuccessMessage('Trail saved.');
            setTimeout(() => {
                navigate('/');
            }, 2000);
        })
        .catch((error) => {
            setLoading(false);
            alert('An error occured.');
            console.log(error);
        });
    };

    useEffect(() => {
        // Initialize the map once (not every time the points state changes)
        if (!mapRef.current) return; 

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

        // click event listener to the map
        map.on('click', function (evt) {
            const coordinates = evt.coordinate;  
            const lonLat = toLonLat(coordinates);  

            setTempPoint({ longitude: lonLat[0], latitude: lonLat[1], coordinates: coordinates, id: Date.now() });
            setModalKey(modalKey => modalKey + 1);
            setModalOpen(true);
        });
    }, []);  // empty array to ensure the map initializes only once

    const handleEditPoint = (point) => {
        setCurrentPoint(point);
        setEditMode(true);
        setModalOpen(true);
    }

    const removePoint = (pointId) => {
        setPoints(points => {
            const updatedPoints = points.filter(p => p.id !== pointId);
            updateMapPoints(updatedPoints);
            return updatedPoints;
        });
    }

    const updateMapPoints = (points) => {
        vectorSourceRef.current.clear();
        points.forEach(point => {
            const pointFeature = new Feature({
                geometry: new Point(fromLonLat([point.longitude, point.latitude])),
                id: point.id
            });
            pointFeature.setStyle(
                new Style({
                    image: new CircleStyle({
                        radius: 6,
                        fill: new Fill({ color: 'blue' }),
                        stroke: new Stroke({
                            color: 'white',
                            width: 2,
                        }),
                    }),
                })
            );
            vectorSourceRef.current.addFeature(pointFeature);
        });
        drawLine(points);
    };

    const drawLine = (points) => {
        if (points.length > 1) {
            const lineCoordinates = points.map(p => fromLonLat([p.longitude, p.latitude]));
            const lineFeature = new Feature({
                geometry: new LineString(lineCoordinates),
            });

            lineFeature.setStyle(
                new Style({
                    stroke: new Stroke({
                        color: 'green',
                        width: 2,
                    }),
                })
            );
            vectorSourceRef.current.addFeature(lineFeature);
        }
    };

    const handleSavePoint = (data) => {
        if (editMode) {
            setPoints(points => points.map(p => p.id === currentPoint.id ? { ...p, ...data } : p));
            updateMapPoints(points.map(p => p.id === currentPoint.id ? { ...p, ...data } : p));
        } else {
            const point = {...data, longitude: tempPoint.longitude, latitude: tempPoint.latitude, id: tempPoint.id};
            setPoints(prevPoints => [...prevPoints, point]);
            updateMapPoints([...points, point]);
        }

        // create a point feature and add to the map
        /*const pointFeature = new Feature({
            geometry: new Point(tempPoint.coordinates),
        });

        pointFeature.setStyle(
            new Style({
                image: new CircleStyle({
                    radius: 6,
                    fill: new Fill({ color: 'blue' }),
                    stroke: new Stroke({
                        color: 'white',
                        width: 2,
                    }),
                }),
            })
        );
        vectorSourceRef.current.addFeature(pointFeature);

        // draw a line connecting points
        if (points.length > 0) {
            const lineCoordinates = [...points.map(p => fromLonLat([p.longitude, p.latitude])), tempPoint.coordinates];
            const lineFeature = new Feature({
                geometry: new LineString(lineCoordinates),
            });

            lineFeature.setStyle(
                new Style({
                    stroke: new Stroke({
                        color: 'green',
                        width: 2,
                    }),
                })
            );
            vectorSourceRef.current.addFeature(lineFeature);
        }*/
        setModalOpen(false);
        setEditMode(false);
        setCurrentPoint(null);
    }

    return (
        <div className='p-4'>
            <BackButton></BackButton>
            <h1 className='text-3xl my-4'>Create Trail</h1>
            <PointModal key={modalKey} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSavePoint} editMode={editMode} pointData={currentPoint}></PointModal>
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
                <div className='my-4'>
                    <ul>
                        {points.map(point => (
                            <li key={point.id}>
                                {point.title || 'New Point'} - {point.latitude}, {point.longitude}
                                <button onClick={() => handleEditPoint(point)}><AiOutlineEdit className='text-yellow-600' /></button>
                                <button onClick={() => removePoint(point.id)}><MdOutlineDelete className='text-red-600' /></button>
                            </li>
                        ))}
                    </ul>
                </div>
                <button className='p-2 bg-sky-300 m-8' onClick={handleSaveTrail}>
                    Save
                </button>
            </div>
        </div>
    )
};

export default CreateTrail;