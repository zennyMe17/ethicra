"use client"
import React from 'react';
import Link from 'next/link';
import { FaFacebook, FaTwitter, FaInstagram, FaSignOutAlt, FaInfoCircle, FaEnvelope, FaUserPlus, FaSignInAlt, FaUserShield } from 'react-icons/fa';
import { auth } from '@/app/firebase/firebaseConfig';
import { useAuthState } from 'react-firebase-hooks/auth';

const Footer: React.FC = () => {
  const [user] = useAuthState(auth);

  return (
    <footer className="bg-white border-t border-gray-200 py-8 flex flex-col items-center font-sans mb-10">
      <div className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 px-4 sm:px-6 lg:px-8">
        {/* Left Section - Mobile App, Community, Company */}
        <div className="grid grid-cols-3 gap-6 mb-6 md:mb-0">
          <div>
            <strong className="block mb-2">Mobile app</strong>
            <p className="text-sm text-gray-600 mb-1">Features</p>
            <p className="text-sm text-gray-600 mb-1">Live share</p>
            <p className="text-sm text-gray-600">Video record</p>
          </div>
          <div>
            <strong className="block mb-2">Community</strong>
            <p className="text-sm text-gray-600 mb-1">Featured artists</p>
            <p className="text-sm text-gray-600 mb-1">The Portal</p>
            <p className="text-sm text-gray-600">Live events</p>
          </div>
          <div>
            <strong className="block mb-2">Company</strong>
            <p className="text-sm text-gray-600 mb-1">About us</p>
            <p className="text-sm text-gray-600 mb-1">Contact us</p>
            <p className="text-sm text-gray-600">History</p>
          </div>
        </div>

        {/* Right Section - Auth Links */}
        <div className="flex flex-col items-center md:items-end">
          {user ? (
            <>
              <Link
                href="/contact"
                className="border border-[#4A3AFF] text-[#4A3AFF] py-2 px-4 rounded mb-2 w-full md:w-[130px] h-[40px] flex items-center justify-center hover:bg-[#F0EDFF] hover:text-[#6357FF] transition-colors duration-200 text-sm"
              >
                <FaEnvelope className="mr-2" size={20} /> Contact
              </Link>
              <Link
                href="/about"
                className="border border-[#4A3AFF] text-[#4A3AFF] py-2 px-4 rounded mb-2 w-full md:w-[130px] h-[40px] flex items-center justify-center hover:bg-[#F0EDFF] hover:text-[#6357FF] transition-colors duration-200 text-sm"
              >
                <FaInfoCircle className="mr-2" size={20} /> About
              </Link>
              <button
                onClick={() => auth.signOut()}
                className="border border-red-500 text-red-500 py-2 px-4 rounded w-full md:w-[130px] h-[40px] flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors duration-200 focus:outline-none text-sm"
              >
                <FaSignOutAlt className="mr-2" size={20} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="border border-[#4A3AFF] text-[#4A3AFF] py-2 px-4 rounded mb-2 w-full md:w-[130px] h-[40px] flex items-center justify-center hover:bg-[#F0EDFF] hover:text-[#6357FF] transition-colors duration-200 text-sm"
              >
                <FaUserPlus className="mr-2" size={20} /> Register
              </Link>
              <Link
                href="/login"
                className="border border-[#4A3AFF] text-[#4A3AFF] py-2 px-4 rounded mb-2 w-full md:w-[130px] h-[40px] flex items-center justify-center hover:bg-[#F0EDFF] hover:text-[#6357FF] transition-colors duration-200 text-sm"
              >
                <FaSignInAlt className="mr-2" size={20} /> Log in
              </Link>
              <Link
                href="/admin"
                className="border border-[#4A3AFF] text-[#4A3AFF] py-2 px-4 rounded w-full md:w-[130px] h-[40px] flex items-center justify-center hover:bg-[#F0EDFF] hover:text-[#6357FF] transition-colors duration-200 text-sm"
              >
                <FaUserShield className="mr-2" size={20} /> ADMIN
              </Link>
            </>
          )}
        </div>
      </div>
      <hr className="w-full border-t border-gray-200 mb-4" />
      <div className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-center text-sm text-gray-600 px-4 sm:px-6 lg:px-8">
        <div className="mb-4 md:mb-0">
          <span>© Team CodeMonks, Inc. 2025. We love our users!</span>
        </div>
        <div className="flex items-center">
          <span className="mr-3">Follow us</span>
          <div className="flex">
            <Link
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full w-8 h-8 sm:w-10 sm:h-10 flex justify-center items-center mr-2 bg-[#1877F2] text-white hover:scale-110 transition-transform duration-200"
            >
              <FaFacebook size={20} />
            </Link>
            <Link
              href="https://twitter.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full w-8 h-8 sm:w-10 sm:h-10 flex justify-center items-center mr-2 bg-[#1DA1F2] text-white hover:scale-110 transition-transform duration-200"
            >
              <FaTwitter size={20} />
            </Link>
            <Link
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full w-8 h-8 sm:w-10 sm:h-10 flex justify-center items-center bg-[#E1306C] text-white hover:scale-110 transition-transform duration-200"
            >
              <FaInstagram size={20} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;