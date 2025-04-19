"use client";
import React, { useState } from 'react';
import teamData from '../data'; // Removed TeamMember import
import { FaChevronLeft, FaChevronRight, FaLinkedin, FaInstagram, FaEnvelope } from 'react-icons/fa';

const Page = () => { // Changed from 'page' to 'Page'
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  const handlePrevCard = () => {
    setCurrentCardIndex((prevIndex) => (prevIndex === 0 ? teamData.length - 1 : prevIndex - 1));
  };

  const handleNextCard = () => {
    setCurrentCardIndex((prevIndex) => (prevIndex === teamData.length - 1 ? 0 : prevIndex + 1));
  };

  const currentMember = teamData[currentCardIndex];

  return (
    <div className="min-h-screen py-10 flex flex-col items-center justify-center">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">Meet Our Team</h1>
      <div className="relative p-6 sm:p-8 rounded-xl shadow-2xl w-[300px] sm:w-[400px] mx-auto backdrop-blur-md bg-opacity-30 bg-white/10 transition-transform duration-300 hover:scale-105">
        <div className="text-center">
          <img
            src={currentMember.image}
            alt={currentMember.name}
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full mx-auto mb-4 sm:mb-6 object-cover"
          />
          <div className="mb-4 sm:mb-6">
            <h3 className="text-3xl sm:text-4xl font-semibold capitalize">{currentMember.name}</h3>
            <p className="text-xl sm:text-2xl text-gray-400">{currentMember.roles.join(', ')}</p>
          </div>
          <div className="flex justify-center space-x-3 sm:space-x-4 mb-6 sm:mb-8"> {/* Adjusted spacing */}
            <a href={currentMember.linkedin} target="_blank" rel="noopener noreferrer">
              <FaLinkedin className="text-3xl sm:text-4xl hover:text-blue-600 hover:scale-110 transition-all text-white bg-gray-800 rounded-full p-2" /> {/* Adjusted icon size */}
            </a>
            <a href={currentMember.instagram} target="_blank" rel="noopener noreferrer">
              <FaInstagram className="text-3xl sm:text-4xl hover:text-pink-500 hover:scale-110 transition-all text-white bg-gray-800 rounded-full p-2" /> {/* Adjusted icon size */}
            </a>
            <a href={currentMember.email} target="_blank" rel="noopener noreferrer">
              <FaEnvelope className="text-3xl sm:text-4xl hover:text-red-600 hover:scale-110 transition-all text-white bg-gray-800 rounded-full p-2" /> {/* Adjusted icon size */}
            </a>
          </div>
        </div>

        <div className="absolute top-1/2 transform -translate-y-1/2 -left-10 sm:-left-20 cursor-pointer bg-gray-800 rounded-full p-2 sm:p-3">
          <FaChevronLeft className="text-white text-3xl sm:text-4xl" onClick={handlePrevCard} />
        </div>
        <div className="absolute top-1/2 transform -translate-y-1/2 -right-10 sm:-right-20 cursor-pointer bg-gray-800 rounded-full p-2 sm:p-3">
          <FaChevronRight className="text-white text-3xl sm:text-4xl" onClick={handleNextCard} />
        </div>
      </div>
    </div>
  );
};

export default Page;