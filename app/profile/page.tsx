"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/app/firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { User, updateEmail, onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

// Country code data (ISO 3166-1 alpha-2)
const countryCodes = [
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" },
  { code: "UA", name: "Ukraine", dialCode: "+380", flag: "🇺🇦" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "PE", name: "Peru", dialCode: "+51", flag: "🇵🇪" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "🇻🇪" },
  { code: "CU", name: "Cuba", dialCode: "+53", flag: "🇨🇺" },
  { code: "DO", name: "Dominican Republic", dialCode: "+1", flag: "🇩🇴" },
  { code: "GT", name: "Guatemala", dialCode: "+502", flag: "🇬🇹" },
  { code: "HN", name: "Honduras", dialCode: "+504", flag: "🇭🇳" },
  { code: "PA", name: "Panama", dialCode: "+507", flag: "🇵🇦" },
  { code: "PR", name: "Puerto Rico", dialCode: "+1", flag: "🇵🇷" },
];

interface UserData {
  email: string;
  name: string;
  phoneNumber: string;
  countryCode: string;
  location: {
    country: string;
    state: string;
    city: string;
  };
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData>({
    email: "",
    name: "",
    phoneNumber: "",
    countryCode: "+91", // Default to India
    location: {
      country: "",
      state: "",
      city: "",
    },
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUser, setIsUser] = useState<boolean>(false); // New state to track if it's a regular user

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(true); // Set loading to true before checking role

      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          setIsUser(userSnap.exists());
        } catch (error) {
          console.error("Error checking user role:", error);
          setIsUser(false);
        }
      } else {
        setIsUser(false);
      }
      setLoading(false); // Set loading to false after checking role
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !isUser) {
        if (!loading) {
          router.push("/unauthorized"); // Redirect if not a regular user and not loading
        }
        return;
      }
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() as UserData;
          setUserData({
            email: data.email,
            name: data.name || "",
            phoneNumber: data.phoneNumber || "",
            countryCode: data.countryCode || "+91", // Default to India if not present
            location: {
              country: data.location?.country || "",
              state: data.location?.state || "",
              city: data.location?.city || "",
            },
          });
        } else {
          console.log("No such user document!");
          // Handle the case where the user is logged in but has no 'users' document
          // Maybe redirect to a setup page or show an error.
          router.push("/unauthorized"); // Redirect as they should have a user profile
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        alert("Failed to load profile data. Please try again.");
      }
    };

    if (!loading && currentUser && isUser) {
      fetchData();
    }
  }, [currentUser, router, loading, isUser]);

  const handleUpdate = async () => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    try {
      await updateDoc(userRef, {
        email: userData.email, // Save email
        name: userData.name,
        phoneNumber: userData.phoneNumber,
        countryCode: userData.countryCode,
        location: {
          country: userData.location.country,
          state: userData.location.state,
          city: userData.location.city,
        },
      });

      if (currentUser.email !== userData.email) {
        await updateEmail(currentUser, userData.email);
      }

      alert("✅ Profile updated successfully!");
      setIsEditing(false); // Disable editing after successful update
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("❌ Error updating profile. Please try again.");
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><p className="text-lg text-gray-700">Checking authentication and user status...</p></div>;

  if (!currentUser) {
    router.push("/login");
    return null;
  }

  if (!isUser) {
    router.push("/unauthorized");
    return null;
  }

  return (
    <div className="bg-[#FAFAFC] py-10">
      <div className="max-w-3xl mx-auto rounded-lg shadow-xl overflow-hidden mt-10 mb-10">
        <div className="bg-transparent py-6 px-6 sm:px-12 flex justify-between items-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-indigo-700 tracking-tight">Your Profile</h2>
          {!isEditing && (
            <Button
              onClick={handleEdit}
              className="border bg-white border-[#4A3AFF] text-[#4A3AFF] py-2 px-4 rounded h-[36px] sm:h-[40px] text-sm flex items-center justify-center hover:bg-[#F0EDFF] hover:cursor-pointer hover:text-[#6357FF] transition-colors duration-200"
            >
              Edit
            </Button>
          )}
        </div>
        <div className="p-6 sm:px-12 sm:py-8">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={userData.email}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</Label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <Select
                  value={userData.countryCode}
                  onValueChange={(value) => setUserData({ ...userData, countryCode: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger className={`flex items-center justify-between rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-2 sm:px-3 py-2 text-gray-500 sm:text-sm ${!isEditing ? 'cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                  <SelectContent className="max-h-40 overflow-y-auto text-sm">
                    {countryCodes.map((country) => (
                      <SelectItem key={country.code} value={country.dialCode}>
                        {country.flag} {country.dialCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  value={userData.phoneNumber}
                  onChange={(e) => setUserData({ ...userData, phoneNumber: e.target.value })}
                  className="flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700">Location</Label>
              <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="country" className="block text-xs font-medium text-gray-700">Country</Label>
                  <Input
                    id="country"
                    type="text"
                    value={userData.location.country}
                    onChange={(e) =>
                      setUserData({
                        ...userData,
                        location: { ...userData.location, country: e.target.value },
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="block text-xs font-medium text-gray-700">State/Province</Label>
                  <Input
                    id="state"
                    type="text"
                    value={userData.location.state}
                    onChange={(e) =>
                      setUserData({
                        ...userData,
                        location: { ...userData.location, state: e.target.value },
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="block text-xs font-medium text-gray-700">City</Label>
                  <Input
                    id="city"
                    type="text"
                    value={userData.location.city}
                    onChange={(e) =>
                      setUserData({
                        ...userData,
                        location: { ...userData.location, city: e.target.value },
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              {isEditing && (
                <Button
                  onClick={() => setIsEditing(false)}
                  className="border border-gray-300 bg-white text-gray-700 py-2 px-4 rounded h-[36px] sm:h-[40px] text-sm flex items-center justify-center hover:bg-gray-100 hover:cursor-pointer transition-colors duration-200"
                >
                  Cancel
                </Button>
              )}
              {isEditing && (
                <Button
                  onClick={handleUpdate}
                  className="border bg-white border-[#4A3AFF] text-[#4A3AFF] py-2 px-4 rounded h-[36px] sm:h-[40px] text-sm flex items-center justify-center hover:bg-[#F0EDFF] hover:cursor-pointer hover:text-[#6357FF] transition-colors duration-200"
                >
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}