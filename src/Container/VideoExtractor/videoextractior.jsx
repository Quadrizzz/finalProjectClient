import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as faceapi from 'face-api.js';
import './videoextractor.css'
import Loader from '../../assets/loader.gif'




const VideoExtractor = ()=>{

    const [selectedFile, setSelectedFile] = useState("");
    const [fileinfo, setFileInfo] = useState("")
    const [faces, setFaces] =  useState([]);
    const [done, setDone] = useState(false)
    const [progress, setProgress] = useState(0)
    const [extracted, setExtracted] = useState(false)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const inputRef = useRef(null);
    let interval;

    useEffect(()=>{

        const loadModels = async()=>{
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models/tiny_face_detector');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models/face_landmark_68');
            await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models/face_landmark_68_tiny');
        }

        loadModels();
    }, [])

    useEffect(()=>{
        if (videoRef.current) {
            videoRef.current.load();
        }
    },[selectedFile])

    const handleFileChanges = (event)=>{
        let video = videoRef.current;
        let canvas = canvasRef.current;
        let facesArray = [];
        let results = []


        // Clear any existing intervals and reset progress
        if (interval) {
            clearInterval(interval);
        }

        setFileInfo(event.target.files[0])
        setSelectedFile(URL.createObjectURL(event.target.files[0]));

        // Function to process the video
        const processVideo = async () => {
            facesArray = []
            console.log(facesArray)
            video.play();
            interval = setInterval(async () => {
                let percent = (video.currentTime.toFixed(0) / video.duration.toFixed(0)) * 100;
                setProgress(percent.toFixed(0));

                if (video.paused || video.ended) {
                    clearInterval(interval);
                    setExtracted(true);
                    if(facesArray.length === 0){
                        setExtracted(true)
                        setDone(true)
                    }
                    else{
                        for (let i = 0; i < facesArray.length; i++) {
                            try {
                                const response = await axios.post('http://localhost:5000/predict_face', { face: facesArray[i] });
                                let result = {
                                    image: facesArray[i],
                                    hog: response.data.hog_prediction,
                                    resnet: response.data.resnet_prediction
                                };
                                results.push(result);
                                if (i === (facesArray.length - 1)) {
                                    setDone(true);
                                    setFaces(results);
                                }
                            } catch (error) {
                                console.error('Error:', error);
                            }
                        }   
                    }
                    return;
                }
                canvas.width = 817;
                canvas.height = 408;
                const context = canvas.getContext("2d");
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                let detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions());

                // Extract face images
                detections.forEach((detection) => {
                    const { _x, _y, _width, _height } = detection._box;
                    const faceCanvas = document.createElement('canvas');
                    faceCanvas.width = _width;
                    faceCanvas.height = _height;
                    faceCanvas.getContext('2d').drawImage(canvas, _x, _y, _width, _height, 0, 0, _width, _height);
                    const faceImage = faceCanvas.toDataURL('image/jpeg');
                    facesArray.push(faceImage);
                    console.log(facesArray)
                });

            }, 1000 / 10);
        };

        // Add new event listener for video processing
        video.addEventListener('loadeddata', processVideo);
        
    }

    const clear = ()=>{
        setDone(false)
        setProgress(0)
        setSelectedFile("")
        setFaces([])
        setExtracted(false)
        setFileInfo("")
        inputRef.current.value = ""
        videoRef.current = null
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        if(interval){
            clearInterval(interval)
        }
    }



    return(
        <>
            <div className='mainContainer'>
                <div className='header'>
                    <h3>Cranalytics</h3>
                </div>
                <div className='main'>
                    <h1>Upload a video for facial recognition forensic analysis</h1>
                    <div className='videoContainer'>
                        <div className='formInput'>
                            <label htmlFor='video-upload'>Uplaod a video</label>
                            <input ref={inputRef} type='file' accept='video/*' onChange={handleFileChanges} style={{ opacity: 0 }}  id='video-upload'/>
                        </div>
                        <div className={selectedFile === "" ? 'fileDetails' : "fileDetails show"}>
                            <p>File Name: {selectedFile === "" ? '' : fileinfo.name}</p>
                            <p>File Size: {selectedFile === "" ? '' : `${(fileinfo.size/ (1024 * 1024)).toFixed(2)}mb` }</p>
                            <p>File Type: {selectedFile === "" ? '' : fileinfo.type}</p>
                        </div>
                        <video ref={videoRef} src={selectedFile} controls={false} muted={true} autoPlay={false} />
                        <canvas ref={canvasRef} style={{display: "none"}}/>
                    </div>
                    <div className='facesContainer'>
                        <p>Faces Extracted From Video</p>
                        {
                            done ?
                            <>
                                <button className='clearButton' onClick={()=>{clear()}}>Clear</button>
                                <div className='videoFaces'>
                                    {faces.map((face, index) => (
                                        <div key={index} className='face'>
                                            <img src={faces[index].image} alt={`face-${index}`} />
                                            <p>HOG Prediction : {faces[index].hog}</p>
                                            <p>ResNet Prediction : {faces[index].resnet}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                            :
                            <div className={selectedFile === "" ? 'loader' : 'loader show'}>
                                {
                                    selectedFile === "" ?
                                    <></>
                                    :
                                    <>
                                        <div style={{ width: `${progress}%`,height: "0.5vw"}}></div>
                                        {
                                            extracted ?
                                            <div className='labelLoader'>
                                                <p>Getting Labels</p>
                                                <img src={Loader} alt="" />
                                            </div>
                                            :
                                            <></>
                                        }
                                    </>
                                }
                            </div>
                        }
                    </div>
                </div>
            </div>
        </>
    )
}

export default VideoExtractor;