"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase/firebaseConfig';

const Page = () => {
  const [userCount, setUserCount] = useState<number | string>(0);

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        setUserCount(usersSnapshot.size);
      } catch (error) {
        console.error("Error fetching user count:", error);
        setUserCount('-');
      }
    };

    fetchUserCount();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <div className="container mx-auto p-6 sm:p-10 my-16 sm:my-32 w-11/12 md:w-10/12 flex flex-col md:flex-row items-center justify-between">
        <div className="flex flex-col gap-4 sm:gap-6 mx-0 sm:mx-2 text-center md:text-left">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-black mb-2 sm:mb-4">Take Online Interview.</h1>
          <p className="text-lg sm:text-2xl text-gray-950 mt-2 sm:mt-4 mb-1 sm:mb-2">NUMBER OF ACTIVE USERS RIGHT NOW</p>
          <p className="text-3xl sm:text-4xl text-blue-600 font-semibold mx-auto md:mx-48">
            {userCount}+
          </p>
        </div>
        <div className="mt-8 md:mt-0">
          <Image
            src="/images/landingpage.jpeg"
            alt="Online interview illustration"
            width={377}
            height={320}
            className="rounded-lg"
            priority
          />
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-[#4A3AFF] py-16 sm:py-24 px-6 sm:px-16 w-screen">
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 w-11/12 md:w-10/12 mx-auto">
          {/* Card 1: Online Assessment (Bottom on small, Left/Lowest on md+) */}
          {/* Increased md:w and h values */}
          <div className="text-center text-[#1D4645] p-6 bg-[#DBEDF5] w-full max-w-sm md:w-[400px] h-[400px] flex flex-col justify-center items-center shadow-md transition-all duration-300 transform-gpu hover:scale-105 hover:shadow-lg order-2 md:order-1 md:mt-32"> {/* Changed h to 400px */}
            <div className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] rounded-full bg-white mb-4 flex items-center justify-center">
              <Image src="/images/Mask.png" alt="Assessment Icon" width={160} height={160} className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">Online Assessment</h2>
            <p className="text-lg">Assess candidates efficiently.</p>
          </div>

          {/* Card 2: Online Interview (Middle) */}
          {/* Increased md:w and h values */}
          <div className="text-center text-white p-6 bg-[#102F2E] w-full max-w-sm md:w-[400px] h-[400px] flex flex-col justify-center items-center shadow-md transition-all duration-300 transform-gpu hover:scale-105 hover:shadow-lg order-1 md:order-2 md:mt-16"> {/* Changed h to 400px */}
            <div className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] rounded-full bg-white mb-4 flex items-center justify-center ">
              <Image src="/images/Mask (2).png" alt="Interview Icon" width={160} height={160} className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">Online Interview</h2>
            <p className="text-lg">Conduct interviews remotely.</p>
          </div>

          {/* Card 3: Report (Top on small, Right/Highest on md+) */}
          {/* Increased md:w and h values */}
          <div className="text-center text-[#1D4645] p-6 bg-[#FEF1E2] w-full max-w-sm md:w-[400px] h-[400px] flex flex-col justify-center items-center shadow-md transition-all duration-300 transform-gpu hover:scale-105 hover:shadow-lg order-3 md:order-3 md:mt-0 mb-48 md:mb-0"> {/* Changed h to 400px */}
            <div className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] rounded-full bg-white mb-4 flex items-center justify-center">
              <Image src="/images/Mask (1).png" alt="Report Icon" width={160} height={160} className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">Report</h2>
            <p className="text-lg">Generate detailed reports.</p>
          </div>
        </div>
      </div>

      {/* Explore Jobs Section */}
      {/* Note: The job cards below also have fixed widths and absolute positioning */}
      <div className="w-11/12 md:w-10/12 mx-auto my-16 sm:my-28 px-4 md:px-11 relative pb-12 sm:pb-20 min-h-[auto] sm:min-h-[800px] hidden sm:block">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-10 gap-4">
          <p className="text-2xl sm:text-3xl font-semibold text-center text-[#1D4645] sm:text-left">Explore Jobs</p>
          <Link
            href={'/login'}
            className="border border-gray-300 px-4 py-2 text-sm sm:text-base text-[#1D4645] hover:bg-[#f0edff] transition-colors duration-200 whitespace-nowrap"
          >
            EXPLORE ALL
          </Link>
        </div>
        {/* Job Cards */}
        <div className="mt-6 sm:mt-0 relative">
          {/* These cards use absolute positioning and fixed widths/heights, consider adjusting them if needed */}
          <div className="w-[410px] h-[305.89px] bg-[#FFF2E6] p-6 mb-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 absolute left-[44px] top-[100px]">
            <div className="w-[35px] h-[37px] sm:w-[45px] sm:h-[47px] rounded-full mb-4 overflow-hidden">
              <Image src="/images/remote.png" alt="Remote Jobs" width={45} height={47} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Remote Jobs</h3>
            <p>Work from anywhere with flexible job opportunities across various industries.</p>
          </div>
          <div className="w-[360px] h-[305.89px] bg-[#FFF2E6] p-6 mb-4 shadow-sm absolute left-[480px] top-[150px] transition-all duration-300 hover:shadow-lg hover:scale-105">
            <div className="w-[35px] h-[37px] sm:w-[45px] sm:h-[47px] rounded-full mb-4 overflow-hidden">
              <Image src="/images/Bank.png" alt="Banking & Finance" width={45} height={47} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Banking & Finance</h3>
            <p>Explore roles in investment, fintech, and financial management.</p>
          </div>
          <div className="w-[260px] h-[305.89px] bg-white p-6 mb-4 shadow-sm absolute left-[190px] top-[420px] transition-all duration-300 hover:shadow-lg hover:scale-105">
            <div className="w-[35px] h-[37px] sm:w-[45px] sm:h-[47px] rounded-full mb-4 overflow-hidden">
              <Image src="/images/image-removebg-preview (3).png" alt="Internship" width={45} height={47} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Internship</h3>
            <p>Gain hands-on experience and kickstart your career with exciting opportunities.</p>
          </div>
          <div className="w-[260px] h-[285.36px] bg-[#FFF2E6] p-6 mb-4 shadow-sm absolute left-[480px] top-[480px] transition-all duration-300 hover:shadow-lg hover:scale-105">
            <div className="w-[35px] h-[37px] sm:w-[45px] sm:h-[47px] rounded-full mb-4 overflow-hidden">
              <Image src="/images/analytics.png" alt="Analytics" width={45} height={47} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Analytics</h3>
            <p>Uncover insights and drive data-informed decisions with cutting-edge analytical roles.</p>
          </div>
          <div className="w-[360px] h-[305.89px] bg-white p-6 shadow-sm absolute left-[770px] top-[480px] transition-all duration-300 hover:shadow-lg hover:scale-105">
            <div className="w-[35px] h-[37px] sm:w-[45px] sm:h-[47px] rounded-full mb-4 overflow-hidden">
              <Image src="/images/markating.png" alt="Marketing" width={45} height={47} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Marketing</h3>
            <p>Create impactful campaigns and drive brand growth with innovative marketing strategies.</p>
          </div>
        </div>
      </div>


      {/* Restructured Last Section - Circles Replaced with Image */}
      <div className="min-h-[600px] flex flex-col md:flex-row mx-auto w-11/12 md:w-10/12 justify-between items-start gap-10 md:gap-20 py-24">

        {/* Left Side - Now Text + Image */}
        <div className="w-full md:w-1/2 flex flex-col">

          {/* 1. Text Div */}
          <div className="mb-8 md:mb-12 text-center md:text-left">
            <p className="text-[#6757C1] text-3xl md:text-[40px] font-medium mb-3 sm:mb-4">You’re in good Hand!</p>
            <p className='text-xl md:text-[30px] leading-snug font-bold'>By choosing Ethicra, you gain a trusted career partner with a proven track record of connecting top talent with the right opportunities.</p>
          </div>

          {/* 2. Image Placeholder Div - Replaces Circle Container */}
          <div className="w-full max-w-md mt-4 mx-auto md:mx-0">
            <Image
              src="/images/image 3.png"
              alt="Illustration showing trust or partnership"
              width={500}
              height={350}
            />
          </div>

        </div>

        {/* Right Side - Changed */}
        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start border p-6 rounded-lg">
          <div className="w-full max-w-md mb-8">
            <Image
              src="/images/image 5.png"
              alt="Data Safeguarding"
              width={500}
              height={300}
            />
          </div>
          <p className="text-xl sm:text-2xl font-semibold mb-3 text-center md:text-left">Ethicra Safeguarding Your`s Data</p>
          <p className='text-base text-gray-700 text-center md:text-left'>We protect your data with a Web Application Firewall (WAF) to block cyber threats and AES encryption for secure storage and transfer. OAuth 2.0, JWT, and Multi-Factor Authentication (MFA),AWS S3 ensure only authorized access. Real-time monitoring and audit logs help detect and prevent security risks.</p>
        </div>
      </div>
    </div>
  );
};

export default Page;