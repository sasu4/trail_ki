import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import {useParams} from 'react-router-dom';
import BackButton from '../../components/BackButton';
import Spinner from '../../components/Spinner';
import PointModal from '../../components/PointModal';

// openlayers components
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer } from 'ol/layer';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Icon, Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import LineString from 'ol/geom/LineString';
import Overlay from 'ol/Overlay';

const ShowTrail = () => {
    const [trail, setTrail] = useState(null);
    const [loading, setLoading] = useState(false);
    const {id} = useParams();
    const mapRef = useRef(null); // reference map container
    const popupRef = useRef(null); // reference for popup overlay to show info on POI
    const [modalOpen, setModalOpen] = useState(false);
    const [currentPoint, setCurrentPoint] = useState(null);

    useEffect(() => {
        setLoading(true);
        axios.get(`http://localhost:5555/trails/${id}`)
        .then((response) => {
            setTrail(response.data);
            setLoading(false);
        })
        .catch((error) => {
            console.log(error);
            setLoading(false);
        });
    }, [id]);

    // map initializacion
    useEffect(() => {
        if(trail && trail.points && trail.points.length>0) {
            // style of POI
            const defaultPointStyle = new Style({
                image: new CircleStyle({
                    radius: 6,
                    fill: new Fill({color: 'blue'}),
                    stroke: new Stroke({
                        color: 'white',
                        width: 2,
                    }),
                }),
            });
            // converts points to OpenLayer features
            const pointFeatures = trail.points.map(point => {
                const feature = new Feature({
                    geometry: new Point(fromLonLat([point.longitude, point.latitude])),
                    title: point.title,
                    point: point,
                });
                feature.setStyle(new Style({
                    image: new Icon({
                        src: 'https://openlayers.org/en/v10.0.0/examples/data/icon.png',
                        scale: 1,
                    }),
                }));
                return feature;
            });

            // create line from points
            const lineCoordinates = trail.points.map(point => fromLonLat([point.longitude, point.latitude]));
            const lineFeature = new Feature({
                geometry: new LineString(lineCoordinates),
            });

            // creater vector source and layer
            const vectorSource = new VectorSource({
                features: [...pointFeatures, lineFeature],  
            });

            const vectorLayer = new VectorLayer({
                source: vectorSource,
            });

            // mapping
            const map = new Map({
                target: mapRef.current, 
                layers: [
                    new TileLayer({
                        source: new OSM(), // openstreetmap base
                    }),
                    vectorLayer,
                ],
                view: new View({
                    center: fromLonLat([trail.points[0].longitude, trail.points[0].latitude]),  // centers map on the first point
                    zoom: 14, 
                }),
            });

            // popup for info on POI
            /*const popupOverlay = new Overlay({
                element: popupRef.current,
                positioning: 'bottom-center',
                stopEvent: false,
            });
            map.addOverlay(popupOverlay);*/

            // click event to highlight POI
            map.on('click', function(evt){
                const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
                    return feature;
                });
                if(feature && feature.getGeometry() instanceof Point) {
                    const pointData = feature.get('point');
                    if (pointData) {
                        setCurrentPoint(pointData); // Set the point data first
                        setModalOpen(true); // Then open the modal
                     }
                    feature.setStyle(new Style({
                        image: new CircleStyle({
                            radius: 8,
                            fill: new Fill({color: 'red'}),
                            stroke: new Stroke({color: 'white', width: 2}),
                        }),
                    }));
                    //const coordinates = feature.getGeometry().getCoordinates();
                    //popupOverlay.setPosition(coordinates);
                    //const title = feature.get('title');
                    //popupRef.current.innerHTML = `<div class='bg-white p-2 rounded shadow-md'>${title}</div>`;
                }
            });
        }
    }, [trail]);

    return (
        <div className='p-4'>
            <BackButton></BackButton>
            <h1 className='text-3xl my-4'>Show trail</h1>
            <PointModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editMode={false} pointData={currentPoint} quizMode={true}></PointModal>
            {loading ? (<Spinner></Spinner>) : trail ? (
                <div className='flex flex-col border-2 border-sky-400 rounder-xl p-4'>
                    <div className='my-4'>
                        <span className='text-xl mr-4 text-gray-500'>Id</span>
                        <span>{trail._id}</span>
                    </div>
                    <div className='my-4'>
                        <span className='text-xl mr-4 text-gray-500'>Name</span>
                        <span>{trail.name}</span>
                    </div>
                    <div className='my-4'>
                        <span className='text-xl mr-4 text-gray-500'>Points</span>
                        <span>
                            {trail.points && trail.points.length>0 ? (
                                <ul>
                                    {trail.points.map((point, idx) => (
                                        <li key={point._id}>
                                            {`Point ${idx + 1}: ${point.title} (${point.longitude}, ${point.latitude})`}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <span>No Points</span>
                            )}
                        </span>
                    </div>
                    {/* Map container */}
                    <div ref={mapRef} className='w-full h-96 mt-6 border-2 border-gray-300' />
                    {/* Popup container for point titles */}
                    <div ref={popupRef} className='ol-popup'></div>
                </div>
            ): (
                <div>No Trail Data Available</div>
            )}
        </div>
    )
};

export default ShowTrail;