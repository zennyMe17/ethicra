'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

const AdminPage = () => {
  const router = useRouter()

  return (
    <div className="bg-[#FAFAFC] min-h-screen py-10">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl px-8 py-12 mt-20">
        <h1 className="text-3xl font-semibold text-indigo-700 mb-10 text-center">Welcome, Admin</h1>

        <div className="flex flex-col gap-4">
          {/* Login Button - Primary Filled */}
          <button
            onClick={() => router.push('/admin/login')}
            className="w-full h-11 bg-[#4A3AFF] text-white font-medium rounded-lg hover:bg-[#6357FF] transition duration-200"
          >
            Login
          </button>

          {/* Signup Button - Secondary Outline */}
          <button
            onClick={() => router.push('/admin/signup')}
            className="w-full h-11 border border-[#4A3AFF] text-[#4A3AFF] font-medium rounded-lg hover:bg-[#F0EDFF] hover:text-[#6357FF] transition duration-200"
          >
            Signup
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
