import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import BackButton from '../../components/BackButton';
import Spinner from '../../components/Spinner';
import { useNavigate } from 'react-router-dom';

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
    const mapRef = useRef(null);
    const vectorSourceRef = useRef(new VectorSource());  // Reference for the vector source (points & lines)
    const navigate = useNavigate();
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

            // ask the user for the point title
            const title = prompt('Enter the title for this point:');
            if (title) {
                const point = {
                    title: title,
                    longitude: lonLat[0],  
                    latitude: lonLat[1]    
                };

                setPoints(prevPoints => [...prevPoints, point]);

                // create a point feature and add to the map
                const pointFeature = new Feature({
                    geometry: new Point(coordinates),
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
                    const lineCoordinates = [...points.map(p => fromLonLat([p.longitude, p.latitude])), coordinates];
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
            }
        });
    }, []);  // empty array to ensure the map initializes only once

    return (
        <div className='p-4'>
            <BackButton></BackButton>
            <h1 className='text-3xl my-4'>Create Trail</h1>
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
            
                <button className='p-2 bg-sky-300 m-8' onClick={handleSaveTrail}>
                    Save
                </button>
            </div>
        </div>
    )
};

export default CreateTrail;