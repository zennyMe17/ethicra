"use client";

import Image from 'next/image';
import Link from 'next/link';

const Page = () => {

  return (
    <div>
      {/* Hero Section */}
      <div className="container mx-auto flex items-center justify-between p-10 my-32 w-10/12">
        <div className="flex flex-col gap-6 mx-2">
          <h1 className="text-7xl font-bold text-black mb-4">Take Online Interview.</h1>
          <p className="text-gray-950 text-2xl mt-4 mb-2">NUMBER OF ACTIVE USERS RIGHT NOW</p>
          <p className="text-4xl text-blue-600 font-semibold mx-48">
            200+
          </p>
        </div>
        <div>
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

      {/* Features Section - Unchanged */}
      <div className="bg-[#4A3AFF] py-24 px-16 h-[600px] overflow-visible w-screen">
        <div className="flex flex-col md:flex-row justify-between gap-2 md:gap-4 w-10/12 mx-auto">
          {/* Card 1: Online Assessment (Bottom) */}
          <div className="text-center text-[#1D4645] p-6 bg-[#DBEDF5] w-full md:w-[300px] h-[350px] flex flex-col justify-center items-center mt-52 shadow-md transition-all duration-300 transform-gpu hover:scale-105 hover:shadow-lg">
            <div className="w-[160px] h-[160px] rounded-full bg-white mb-4 flex items-center justify-center">
              <Image src="/images/Mask.png" alt="Assessment Icon" width={160} height={160} />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Online Assessment</h2>
            <p className="text-lg">Assess candidates efficiently.</p>
          </div>

          {/* Card 2: Online Interview (Middle) */}
          <div className="text-center text-white p-6 bg-[#102F2E] w-full md:w-[300px] h-[350px] flex flex-col justify-center items-center md:translate-y-[-40px] mt-36 shadow-md transition-all duration-300 transform-gpu hover:scale-105 hover:shadow-lg">
            <div className="w-[160px] h-[160px] rounded-full bg-white mb-4 flex items-center justify-center ">
              <Image src="/images/Mask (2).png" alt="Interview Icon" width={160} height={160} />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Online Interview</h2>
            <p className="text-lg">Conduct interviews remotely.</p>
          </div>

          {/* Card 3: Report (Top) */}
          <div className="text-center text-[#1D4645] p-6 bg-[#FEF1E2] w-full md:w-[300px] h-[350px] flex flex-col justify-center items-center md:translate-y-[-48px] mt-1 shadow-md transition-all duration-300 transform-gpu hover:scale-105 hover:shadow-lg">
            <div className="w-[160px] h-[160px] rounded-full bg-white mb-4 flex items-center justify-center">
              <Image src="/images/Mask (1).png" alt="Report Icon" width={160} height={160} />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Report</h2>
            <p className="text-lg">Generate detailed reports.</p>
          </div>
        </div>
      </div>

      {/* Explore Jobs Section - Unchanged */}
      <div className="w-11/12 md:w-10/12 mx-auto my-28 px-4 md:px-11 relative pb-20 min-h-[800px]">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
          <p className="text-3xl font-semibold text-center text-[#1D4645] sm:text-left">Explore Jobs</p>
          <Link
            href={'/login'}
            className="border border-gray-300 px-4 py-2 text-[#1D4645] hover:bg-[#f0edff] transition-colors duration-200 whitespace-nowrap"
          >
            EXPLORE ALL
          </Link>
        </div>
        {/* Job Cards ... */}
        <div className="w-[410px] h-[305.89px] bg-[#FFF2E6] p-6 mb-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 absolute left-[44px] top-[100px]">
          <div className="w-[45px] h-[47px] rounded-full mb-4 overflow-hidden">
            <Image src="/images/remote.png" alt="Remote Jobs" width={45} height={47} className="w-full h-full object-cover" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Remote Jobs</h3>
          <p>Work from anywhere with flexible job opportunities across various industries.</p>
        </div>
        <div className="w-[360px] h-[305.89px] bg-[#FFF2E6] p-6 mb-4 shadow-sm absolute left-[480px] top-[150px] transition-all duration-300 hover:shadow-lg hover:scale-105">
          <div className="w-[45px] h-[47px] rounded-full mb-4 overflow-hidden">
            <Image src="/images/Bank.png" alt="Banking & Finance" width={45} height={47} className="w-full h-full object-cover" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Banking & Finance</h3>
          <p>Explore roles in investment, fintech, and financial management.</p>
        </div>
        <div className="w-[260px] h-[305.89px] bg-white p-6 mb-4 shadow-sm absolute left-[190px] top-[420px] transition-all duration-300 hover:shadow-lg hover:scale-105">
          <div className="w-[45px] h-[47px] rounded-full mb-4 overflow-hidden">
            <Image src="/images/image-removebg-preview (3).png" alt="Internship" width={45} height={47} className="w-full h-full object-cover" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Internship</h3>
          <p>Gain hands-on experience and kickstart your career with exciting opportunities.</p>
        </div>
        <div className="w-[260px] h-[285.36px] bg-[#FFF2E6] p-6 mb-4 shadow-sm absolute left-[480px] top-[480px] transition-all duration-300 hover:shadow-lg hover:scale-105">
          <div className="w-[45px] h-[47px] rounded-full mb-4 overflow-hidden">
            <Image src="/images/analytics.png" alt="Analytics" width={45} height={47} className="w-full h-full object-cover" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Analytics</h3>
          <p>Uncover insights and drive data-informed decisions with cutting-edge analytical roles.</p>
        </div>
        <div className="w-[360px] h-[305.89px] bg-white p-6 shadow-sm absolute left-[770px] top-[480px] transition-all duration-300 hover:shadow-lg hover:scale-105">
          <div className="w-[45px] h-[47px] rounded-full mb-4 overflow-hidden">
            <Image src="/images/markating.png" alt="Marketing" width={45} height={47} className="w-full h-full object-cover" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Marketing</h3>
          <p>Create impactful campaigns and drive brand growth with innovative marketing strategies.</p>
        </div>
      </div>

      {/* Restructured Last Section - Circles Replaced with Image */}
      <div className="min-h-[600px] flex flex-col md:flex-row mx-auto w-11/12 md:w-10/12 justify-between items-start gap-10 md:gap-20 py-24">

        {/* Left Side - Now Text + Image */}
        <div className="w-full md:w-1/2 flex flex-col">

          {/* 1. Text Div */}
          <div className="mb-8 md:mb-12">
            <p className="text-[#6757C1] text-4xl md:text-[40px] font-medium  mb-4">You’re in good Hand!</p>
            <p className='text-2xl md:text-[30px] leading-snug font-bold'>By choosing Ethicra, you gain a trusted career partner with a proven track record of connecting top talent with the right opportunities.</p>
          </div>

          {/* 2. Image Placeholder Div - Replaces Circle Container */}
          <div className="w-full max-w-md mt-4">
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
          <p className="text-2xl font-semibold mb-3 text-center md:text-left">Ethicra Safeguarding Your Data</p>
          <p className='text-base text-gray-700 text-center md:text-left'>We protect your data with a Web Application Firewall (WAF) to block cyber threats and AES encryption for secure storage and transfer. OAuth 2.0, JWT, and Multi-Factor Authentication (MFA) ensure only authorized access. Real-time monitoring and audit logs help detect and prevent security risks.</p>
        </div>
      </div>
    </div>
  );
};

export default Page;
