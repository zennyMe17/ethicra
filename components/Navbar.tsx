"use client";

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { app, db } from '@/app/firebase/firebaseConfig'; // Assuming your Firebase config is here
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaCog, FaSignOutAlt, FaChevronDown, FaChevronUp, FaHome, FaUser, FaTachometerAlt } from 'react-icons/fa';
import { doc, getDoc } from 'firebase/firestore';

const dropdownVariants = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.1, ease: "easeIn" } },
};

const Navbar = () => {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(pathname); // Initialize with the current path
  const [user, setUser] = useState<User | null>(null); // State to track logged-in user
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const auth = getAuth(app);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setDisplayName(docSnap.data()?.name || currentUser.displayName || currentUser.email?.split('@')[0] || 'Account');
        } else {
          setDisplayName(currentUser.displayName || currentUser.email?.split('@')[0] || 'Account');
        }
      } else {
        setDisplayName(null);
      }
    });

    return () => unsubscribeAuth(); // Cleanup listener on unmount
  }, [auth]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  const handleTabClick = (href: string) => {
    setActiveTab(href);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    try {
      await signOut(auth);
      console.log('User signed out');
      router.push('/'); // Redirect to home or login page after logout
    } catch (error) {
      console.error('Error signing out:', error);
      // Handle logout error (e.g., display a message)
    }
  };

  return (
    <nav className="bg-white p-5 shadow-md">
      <div className="container mx-auto flex justify-between items-center px-9">
        <Link href={'/'} className="text-2xl font-bold text-[#4A3AFF]">
          Logo
        </Link>
        <div className="flex items-center space-x-6">
          {!user && (
            <div className="hidden sm:flex items-center space-x-6">
              <Link
                href={'/'}
                className={`text-[#5D5A88] relative hover:text-[#4A3AFF] transition-colors duration-200 ${activeTab === '/' ? 'font-semibold' : ''
                  }`}
                onClick={() => handleTabClick('/')}>
                Home
                {activeTab === '/' && (
                  <motion.div layoutId="active-underline" className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-[#4A3AFF] rounded-full" />
                )}
              </Link>
              <Link
                href={'/about'}
                className={`text-[#5D5A88] relative hover:text-[#4A3AFF] transition-colors duration-200 ${activeTab === '/about' ? 'font-semibold' : ''
                  }`}
                onClick={() => handleTabClick('/about')}>
                About
                {activeTab === '/about' && (
                  <motion.div layoutId="active-underline" className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-[#4A3AFF] rounded-full" />
                )}
              </Link>
              <Link
                href={'/contact'}
                className={`text-[#5D5A88] relative hover:text-[#4A3AFF] transition-colors duration-200 ${activeTab === '/contact' ? 'font-semibold' : ''
                  }`}
                onClick={() => handleTabClick('/contact')}>
                Contact
                {activeTab === '/contact' && (
                  <motion.div layoutId="active-underline" className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-[#4A3AFF] rounded-full" />
                )}
              </Link>
            </div>
          )}

          {user ? (
            // Stylish Profile Dropdown
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="focus:outline-none flex items-center gap-2"
              >
                <FaUserCircle size={28} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700 hidden sm:block">
                  {displayName}
                </span>
                {isDropdownOpen ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    className="absolute top-12 right-0 bg-white shadow-lg rounded-md py-2 w-48 z-20 border border-gray-100"
                    variants={dropdownVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Link href="/" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2">
                      <FaHome className="text-gray-500" size={16} />
                      Home
                    </Link>
                    <Link href="/dashboard" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2">
                      <FaTachometerAlt className="text-gray-500" size={16} />
                      Dashboard
                    </Link>
                    <Link href="/profile" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2">
                      <FaUser className="text-gray-500" size={16} />
                      Profile
                    </Link>
                    <div className="border-t border-gray-200 my-1"></div>
                    <Link href="/settings" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2">
                      <FaCog className="text-gray-500" size={16} />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-150 w-full text-left flex items-center gap-2 focus:outline-none"
                    >
                      <FaSignOutAlt className="text-red-500" size={16} />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            // Login and Get Started Buttons
            <div className="flex items-center space-x-6">
              <Link
                href={'/login'}
                className="border border-gray-300 rounded-md px-4 py-2 text-[#5D5A88] hover:bg-gray-100 hover:text-[#4A3AFF] transition-colors duration-200"
                onClick={() => handleTabClick('/login')}>
                Login
              </Link>
              <Link
                href={'/sign-up'}
                className="bg-[#4A3AFF] text-white rounded-md px-4 py-2 hover:bg-[#6357FF] transition-colors duration-200"
                onClick={() => handleTabClick('/sign-up')}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;