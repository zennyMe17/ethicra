'use client'
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Upload } from 'lucide-react'

import { auth, db } from '@/app/firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

const OCR_SPACE_API_KEY = 'helloworld' // Replace with your real API key

export default function OcrSpaceClient() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setText('')
      setError(null)
    }
  }

  const runOcrFromFile = async () => {
    if (!file) {
      setError('Please select a PDF or image file')
      return
    }

    setLoading(true)
    setError(null)
    setText('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('apikey', OCR_SPACE_API_KEY)
      formData.append('language', 'eng')
      formData.append('isOverlayRequired', 'false')

      const res = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.IsErroredOnProcessing) {
        setError(data.ErrorMessage.join(', '))
      } else {
        setText(data.ParsedResults?.[0]?.ParsedText || 'No text found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to call OCR API')
    } finally {
      setLoading(false)
    }
  }

  const getResumeUrlFromFirestore = async (): Promise<string | null> => {
    const user = auth.currentUser
    if (!user) {
      setError('User not authenticated')
      return null
    }

    const userRef = doc(db, "users", user.uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      setError('User document not found')
      return null
    }

    const data = userSnap.data()
    return data?.resumeUrl || null
  }

  const runOcrFromUrl = async (resumeUrl: string) => {
    setLoading(true)
    setError(null)
    setText('')

    try {
      const formData = new FormData()
      formData.append('url', resumeUrl)
      formData.append('apikey', OCR_SPACE_API_KEY)
      formData.append('language', 'eng')
      formData.append('isOverlayRequired', 'false')

      const res = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.IsErroredOnProcessing) {
        setError(data.ErrorMessage.join(', '))
      } else {
        setText(data.ParsedResults?.[0]?.ParsedText || 'No text found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to call OCR API')
    } finally {
      setLoading(false)
    }
  }

  const handleScanResumeFromDb = async () => {
    const url = await getResumeUrlFromFirestore()
    if (!url) {
      setError('No resume URL found in Firestore.')
      return
    }
    await runOcrFromUrl(url)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg rounded-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">OCR.space Resume Scanner</CardTitle>
        <CardDescription>Upload a file or scan your stored resume from Firestore</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="file-upload" className="font-semibold">Select PDF or Image File</Label>
          <Input
            id="file-upload"
            type="file"
            accept="application/pdf,image/*"
            onChange={handleFileChange}
            className="file:text-blue-600 file:font-semibold file:bg-blue-50 file:border-blue-200 file:rounded-md file:mr-4 file:py-2 file:px-4 file:border-0 hover:file:bg-blue-100"
          />
          {file && <p className="text-sm text-gray-500 mt-2">Selected: {file.name}</p>}
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        <Button
          onClick={runOcrFromFile}
          disabled={!file || loading}
          className="w-full py-2.5 px-4 rounded-lg text-lg font-semibold
                     bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-md hover:shadow-lg
                     disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Run OCR on Uploaded File
            </>
          )}
        </Button>

        <Button
          onClick={handleScanResumeFromDb}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg text-lg font-semibold bg-gradient-to-r from-green-500 to-green-700 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Scanning Resume...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Scan Resume from Firestore
            </>
          )}
        </Button>

        <Textarea
          readOnly
          rows={10}
          value={text}
          placeholder="Extracted text will appear here..."
          className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm resize-y"
        />
      </CardContent>
    </Card>
  )
}
