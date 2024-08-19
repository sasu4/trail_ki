import React, {useEffect, useState } from 'react';
import axios from 'axios';
import Spinner from '../../components/Spinner';
import {Link} from 'react-router-dom';
import {AiOutlineEdit} from 'react-icons/ai';
import {BsInfoCircle} from 'react-icons/bs';
import {MdOutlineAddBox, MdOutlineDelete} from 'react-icons/md';

const Home = () => {
    const [trails, setTrail] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(()=> {
        setLoading(true);
        axios.get('http://localhost:5555/trails').then((response) => {
            setTrail(response.data.data);
            setLoading(false);
        })
        .catch((error) => {
            console.log(error);
            setLoading(false);
        });
    }, []);
    return (
        <div className='p-4'>
            <div className='flex justify-between items-center'>
                <h1 className='text-3xl my-8'>Trails list</h1>
                <Link to='/trails/create'><MdOutlineAddBox className='text-sky-800 text-4xl' /></Link>              
            </div>
            {loading ? (
                <Spinner></Spinner>
            ) : (
                <table className='w-full border-separate border-spacing-2'>
                    <thead>
                        <tr>
                            <th className='border border-slate-600 rounded-md'>No</th>
                            <th className='border border-slate-600 rounded-md'>Trail</th>
                            <th className='border border-slate-600 rounded-md max-md:hidden'>Points</th>
                            <th className='border border-slate-600 rounded-md'>Operations</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trails.map((trail, index) => (
                            <tr key={trail._id} className='h-8'>
                                <td>{index+1}</td>
                                <td>{trail.name}</td>
                                <td>
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
                                </td>
                                <td>
                                    <div className='flex justify-center gap-x-4'>
                                        <Link to={`/trails/details/${trail._id}`}><BsInfoCircle className='text-2xl text-green-800' /></Link>
                                        <Link to={`/trails/edit/${trail._id}`}><AiOutlineEdit className='text-2xl text-yellow-600' /></Link>
                                        <Link to={`/trails/remove/${trail._id}`}><MdOutlineDelete className='text-2xl text-red-600' /></Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             )}
        </div>
    )
};

export default Home;