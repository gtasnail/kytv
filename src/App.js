import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, UserPlus, Loader, Globe, X, Search } from 'lucide-react';
import { io } from 'socket.io-client';
import countryList from 'react-select-country-list';
import Header from './components/Header'; 
import Rules from './components/Rules';
import * as CountryFlags from 'country-flag-icons/react/3x2';

import 'react-resizable/css/styles.css';

const socket = io();


export default function VideoChat() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [notification, setNotification] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isOnlineUsersAvailable, setIsOnlineUsersAvailable] = useState(true);
  const [country, setCountry] = useState(null);
  const [countries, setCountries] = useState([]);
  const [isCameraDetected, setIsCameraDetected] = useState(false);
  const [isCountrySelectOpen, setIsCountrySelectOpen] = useState(false);
  const [localCountryStats, setLocalCountryStats] = useState({});

  const [showAgeVerification, setShowAgeVerification] = useState(true);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [countryStats, setCountryStats] = useState({});

  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const [orientation, setOrientation] = useState(window.screen.orientation.type);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const handleOpenRules = () => {
    setShowRules(true);
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setIsCameraDetected(true);
      setNotification('Press start to begin.');
    } catch (error) {
      setNotification('Error accessing camera and microphone.');
      setIsCameraDetected(false);
    }
  };

  useEffect(() => {
    if (isAgeVerified) {
      startLocalStream();
    }
  }, [isAgeVerified]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    const handleOrientationChange = () => {
      setOrientation(window.screen.orientation.type);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const preventFullscreen = useCallback((event) => {
    event.preventDefault();
  }, []);

  useEffect(() => {
    const localVideo = localVideoRef.current;
    const remoteVideo = remoteVideoRef.current;

    if (localVideo) {
      localVideo.addEventListener('webkitbeginfullscreen', preventFullscreen);
    }
    if (remoteVideo) {
      remoteVideo.addEventListener('webkitbeginfullscreen', preventFullscreen);
    }

    return () => {
      if (localVideo) {
        localVideo.removeEventListener('webkitbeginfullscreen', preventFullscreen);
      }
      if (remoteVideo) {
        remoteVideo.removeEventListener('webkitbeginfullscreen', preventFullscreen);
      }
    };
  }, [preventFullscreen]);

  const handleAgeVerification = (isOver18) => {
    if (isOver18) {
      setIsAgeVerified(true);
      setShowAgeVerification(false);
      startLocalStream();
      socket.emit('request-country-stats');
    } else {
      window.location.href = 'https://www.google.com';
    }
  };

  const cleanupCurrentConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [remoteStream]);
  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      console.log('Peer connection already exists, skipping creation');
      return;
    }
    
    console.log('Creating peer connection...');
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // lol
    };

    peerConnectionRef.current = new RTCPeerConnection(configuration);

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      console.log('Received remote stream');
      setRemoteStream(event.streams[0]);
    };

    if (localStream) {
      console.log('Adding local stream tracks to peer connection');
      localStream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, localStream));
    } else {
      console.warn('Local stream not available when creating peer connection');
    }
  }, [localStream]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);
  
  useEffect(() => {
    if (notification) {
      setShowNotification(true);
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000); 

      return () => clearTimeout(timer);
    }
  }, [notification]);


  useEffect(() => {
    const fetchUserCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/'); // do this server side or something idk kinda useless
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        const userCountry = { 
          value: data.country_code, 
          label: data.country_name,
          FlagComponent: CountryFlags[data.country_code]
        };
        setNotification(data.country_name);
        setCountry(userCountry);
      } catch (error) {
        console.error('Error fetching user country:', error);
        setCountry({ 
          value: 'US', 
          label: 'United States',
          FlagComponent: CountryFlags['US']
        });
      }
    };
  
    fetchUserCountry();
  
    const options = countryList().getData().map(country => ({
      ...country,
      FlagComponent: CountryFlags[country.value]
    }));
    setCountries(options);
  }, []);

  useEffect(() => {
    const handleCountryStatsUpdate = (stats) => {
      setLocalCountryStats(stats);
      if (!country) {
        const mostPopularCountry = Object.entries(stats).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        const selectedCountry = countries.find(c => c.value === mostPopularCountry);
        if (selectedCountry) {
          setCountry(selectedCountry);
        }
      }
    };

    socket.on('country-stats-update', handleCountryStatsUpdate);

    return () => {
      socket.off('country-stats-update', handleCountryStatsUpdate);
    };
  }, [country, countries]);


  useEffect(() => {
    if (remoteStream && remoteVideoRef.current && remoteAudioRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteAudioRef.current.srcObject = remoteStream;

      remoteAudioRef.current.play().catch(error => {
        console.error('Audio autoplay failed:', error);
      });
    }
  }, [remoteStream]);

  const handleRemoteStreamPlay = useCallback(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().catch(error => {
        console.error('Audio play failed:', error);
      });
    }
  }, []);


  useEffect(() => {
    const handlePartnerFound = () => {
      setIsSearching(false);
      setNotification('Connected to a stranger.');
    };
    const handleStartCall = async () => {
      createPeerConnection();
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socket.emit('offer', offer);
    };

    const handleOffer = async (offer) => {
      createPeerConnection();
      await peerConnectionRef.current.setRemoteDescription(offer);
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socket.emit('answer', answer);
    };

    const handleAnswer = async (answer) => {
      await peerConnectionRef.current.setRemoteDescription(answer);
    };

    const handleIceCandidate = (candidate) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handlePartnerDisconnected = () => {
      setNotification('Your chat partner has disconnected. Looking for a new partner...');
      cleanupCurrentConnection();
      if (isChatActive) {
        findNewPartner();
      }
    };

    const handleNoUsersAvailable = () => {
      setNotification('There is no one else online right now. We will keep trying!');
      setIsSearching(false);
      setIsOnlineUsersAvailable(false);
      setTimeout(() => {
        if (isChatActive && !isSearching) {
          findNewPartner();
        }
      }, 5000);
    };
    const handleUsersAvailable = () => {
      setIsOnlineUsersAvailable(true);
    };

    const handleDisconnectFromPartner = () => {
      cleanupCurrentConnection();
      setNotification('Disconnected from current partner due to country change.');
    };



    socket.on('partner-found', handlePartnerFound);
    socket.on('start_call', handleStartCall);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('partner-disconnected', handlePartnerDisconnected);
    socket.on('disconnect-from-partner', handleDisconnectFromPartner);
    socket.on('no-users-available', handleNoUsersAvailable);
    socket.on('users-available', handleUsersAvailable);

    return () => {
      socket.off('partner-found', handlePartnerFound);
      socket.off('start_call', handleStartCall);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('partner-disconnected', handlePartnerDisconnected);
      socket.off('disconnect-from-partner', handleDisconnectFromPartner);
      socket.off('no-users-available', handleNoUsersAvailable);
      socket.off('no-users-available', handleNoUsersAvailable);
      socket.off('users-available', handleUsersAvailable);
    };
  });

   const startChat = async () => {
    if (!localStream) {
      await startLocalStream();
    }
    if (isCameraDetected) {
      setIsChatActive(true);
      setIsSearching(true);
      socket.emit('join', { country: country.value });
      findNewPartner();
    } else {
      setNotification('Camera not detected. Please check your camera and try again.');
    }
  };



  const stopChat = () => {
    socket.emit('stop-searching');
    cleanupCurrentConnection();
    setIsChatActive(false);
    setIsSearching(false);
    setNotification('Chat stopped. Click "Start Chat" to begin again.');
    // i stop the local stream, just keep it for preview
  };


  

  const findNewPartner = useCallback(() => {
    if (isSearching || !isChatActive) return;
    cleanupCurrentConnection();
    setIsSearching(true);
    socket.emit('find-partner', { country: country.value });
    setNotification('Searching for a chat partner...');
  }, [isSearching, isChatActive, country, cleanupCurrentConnection]);

  const handleCountryChange = useCallback((selectedCountry) => {
    setCountry(selectedCountry);
    setIsCountrySelectOpen(false);
    if (isChatActive) {
      socket.emit('disconnect-from-partner');
      cleanupCurrentConnection();
      setIsSearching(true);
      socket.emit('find-partner', { country: selectedCountry.value });
      setNotification(`Switched to ${selectedCountry.label}. Searching for a new chat partner...`);
    }
  }, [isChatActive, cleanupCurrentConnection]);

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const AgeVerificationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white text-black p-8 rounded-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Age Verification</h2>
        <p className="mb-4">
          This site is intended for adults over 18 years of age. By entering, you confirm that:
        </p>
        <ul className="list-disc list-inside mb-6">
          <li>You are at least 18 years old</li>
          <li>You understand this is a platform for random video chats</li>
          <li>You agree to use the platform responsibly and respectfully</li>
          <li>You have read and agree to abide by our <button 
              onClick={() => setShowRules(true)} 
              className="text-blue-600 hover:underline"
            >
              Chat Rules and Guidelines
            </button>
          </li>
        </ul>
        <div className="space-y-2">
          <button
            onClick={() => handleAgeVerification(true)}
            className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition-colors"
          >
            I am over 18 and I agree to the rules
          </button>
          <button
            onClick={() => handleAgeVerification(false)}
            className="w-full bg-gray-200 text-black py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            I am not over 18 or I do not agree
          </button>
        </div>
      </div>
    </div>
  );
   const CountrySelectButton = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const menuRef = useRef(null);
  
    const sortedCountries = countries
      .map(country => ({
        ...country,
        users: localCountryStats[country.value] || 0
      }))
      .sort((a, b) => b.users - a.users);
  
    const filteredCountries = sortedCountries.filter(country =>
      country.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setIsCountrySelectOpen(false);
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
  
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsCountrySelectOpen(!isCountrySelectOpen)}
          className={`p-2 sm:p-3 rounded-full bg-black text-white hover:bg-gray-800 transition-colors shadow-md border border-white flex items-center justify-center`}
        >
          {country && country.FlagComponent ? (
            <country.FlagComponent title={country.label} className="w-5 h-5" />
          ) : (
            <Globe size={20} />
          )}
        </button>
  
        {isCountrySelectOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white text-black p-6 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Select a Country</h2>
                <button onClick={() => setIsCountrySelectOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.line
                )}
                  className="w-full p-2 pr-10 border border-gray-300 rounded-md"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
              <div className="overflow-y-auto flex-grow">
                {filteredCountries.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      handleCountryChange(option);
                      setIsCountrySelectOpen(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      {option.FlagComponent && <option.FlagComponent title={option.label} className="mr-3 w-6 h-4" />}
                      <span>{option.label}</span>
                    </div>
                    <span className="text-sm text-gray-500">{option.users} users</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 relative overflow-hidden">
      <Header onOpenRules={handleOpenRules} />
      {showAgeVerification && <AgeVerificationModal />}
      {showRules && <Rules onClose={() => setShowRules(false)} />}
      <div 
        className={`fixed left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md transition-all duration-1000 ease-in-out ${
          showNotification ? 'top-16 opacity-100' : '-top-full opacity-0'
        }`}
      >
        <div className="bg-black border border-white text-white px-4 py-2 rounded-md shadow-lg flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setShowNotification(false)} className="ml-2 focus:outline-none">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }}></div>

      <div className="flex flex-col lg:flex-row justify-center items-center space-y-4 lg:space-y-0 lg:space-x-4 mb-4 sm:mb-6 md:mb-8 relative z-10 w-full">
        <div className="relative w-full lg:w-1/2 aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-white">
          {localStream ? (
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <VideoOff className="text-white" size={48} />
            </div>
          )}
          {localStream && !isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
              <VideoOff className="text-white" size={48} />
            </div>
          )}
        </div>
        <div className="relative w-full lg:w-1/2 aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-white">
          {remoteStream ? (
            <>
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover" 
                onPlay={handleRemoteStreamPlay}
              />
              <audio ref={remoteAudioRef} autoPlay playsInline />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              {isChatActive ? (
                <Loader className="text-white animate-spin" size={48} />
              ) : (
                <UserPlus className="text-white" size={48} />
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-4 relative z-10">
        <CountrySelectButton />
        <button
          onClick={isChatActive ? stopChat : startChat}
          disabled={!isCameraDetected && !isChatActive}
          className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full ${
            isChatActive 
              ? 'bg-white text-black hover:bg-gray-200' 
              : 'bg-black text-white hover:bg-gray-800'
          } font-semibold transition-colors shadow-md border border-white text-sm sm:text-base
          ${(!isCameraDetected && !isChatActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isChatActive ? 'Stop Chat' : 'Start Chat'}
        </button>
        <button
          onClick={findNewPartner}
          disabled={!isChatActive || isSearching}
          className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-white text-black hover:bg-gray-200 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md border border-black text-sm sm:text-base"
        >
          Next Person
        </button>
        <button
          onClick={toggleVideo}
          className={`p-2 sm:p-3 rounded-full ${
            isVideoEnabled ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'
          } transition-colors shadow-md border border-white`}
        >
          {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        <button
          onClick={toggleAudio}
          className={`p-2 sm:p-3 rounded-full ${
            isAudioEnabled ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'
          } transition-colors shadow-md border border-white`}
        >
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
      </div>
    </div>
  );
}