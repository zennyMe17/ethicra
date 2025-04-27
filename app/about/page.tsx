"use client";
import React from 'react';
import teamData from '../data';
import { FaLinkedin, FaInstagram, FaEnvelope } from 'react-icons/fa';

const Page = () => {
  return (
    // Changed py-10 to py-6 to reduce top/bottom padding
    <div className="my-16 py-6 flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 text-center">Meet Our Team</h1>
      <div className="flex flex-wrap justify-center gap-6 sm:gap-8"> {/* Container for multiple cards */}
        {teamData.map((member, index) => ( // Map over teamData to render each member
          <div
            key={index} // Important for lists in React
            className="p-6 sm:p-8 rounded-xl shadow-2xl w-[300px] mx-auto backdrop-blur-md bg-opacity-30 bg-white/10 transition-transform duration-300 hover:scale-105"
          >
            <div className="text-center">
              <img
                src={member.image}
                alt={member.name}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full mx-auto mb-4 sm:mb-6 object-cover"
              />
              <div className="mb-4 sm:mb-6">
                <h3 className="text-2xl sm:text-3xl font-semibold capitalize">{member.name}</h3>
                <p className="text-lg sm:text-xl text-gray-400">{member.roles.join(', ')}</p>
              </div>
              <div className="flex justify-center space-x-3 sm:space-x-4">
                {member.linkedin && (
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                    <FaLinkedin className="text-3xl sm:text-4xl hover:text-blue-600 hover:scale-110 transition-all text-white bg-gray-800 rounded-full p-2" />
                  </a>
                )}
                {member.instagram && (
                  <a href={member.instagram} target="_blank" rel="noopener noreferrer">
                    <FaInstagram className="text-3xl sm:text-4xl hover:text-pink-500 hover:scale-110 transition-all text-white bg-gray-800 rounded-full p-2" />
                  </a>
                )}
                {member.email && (
                  <a href={`mailto:${member.email}`}>
                    <FaEnvelope className="text-3xl sm:text-4xl hover:text-red-600 hover:scale-110 transition-all text-white bg-gray-800 rounded-full p-2" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Page;