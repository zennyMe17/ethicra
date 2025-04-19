"use client";
import { useState } from "react";
import { auth } from "@/app/firebase/firebaseConfig";
import {
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { LockClosedIcon, TrashIcon } from '@heroicons/react/24/solid'; // Ensure you have Heroicons v2 installed

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("password"); // Default active tab
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  const userHasPassword = () => {
    return auth.currentUser?.providerData.some(
      (provider) => provider.providerId === "password"
    );
  };

  const handleChangePassword = async () => {
    if (!auth.currentUser) {
      addToast("No user logged in.");
      return;
    }

    if (!userHasPassword()) {
      addToast(
        "Password change is not available for your login method."
      );
      return;
    }

    if (!currentPassword) {
      addToast("Please enter your current password to change the password.");
      return;
    }
    if (newPassword.length < 6) {
      addToast("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword === currentPassword) {
      addToast("New password cannot be the same as the current password.");
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      addToast("Your password has been updated successfully.");
      setNewPassword("");
      setCurrentPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      addToast("Authentication failed. Please enter the correct current password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) {
      addToast("No user logged in.");
      return;
    }

    if (!currentPassword && userHasPassword()) {
      addToast("Please enter your current password to delete your account.");
      return;
    }

    if (deleteConfirmation.toLowerCase() !== "delete") {
      addToast("Please type 'delete' to confirm account deletion.");
      return;
    }

    setIsDeleting(true);
    try {
      if (userHasPassword()) {
        const credential = EmailAuthProvider.credential(
          auth.currentUser.email!,
          currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
      } else {
        // For passwordless users, we might need a different approach for verification
        // such as prompting them to sign in again or using a recent sign-in.
        // For this example, we'll just proceed without password reauthentication.
        // **WARNING:** This might have security implications. Consider more robust verification.
        addToast("Account deletion initiated. Please wait...");
      }
      await deleteUser(auth.currentUser);
      addToast("Your account has been deleted successfully.");
      router.push("/"); // Redirect to home page after deletion
    } catch (error) {
      console.error("Error deleting account:", error);
      addToast("Account deletion failed. Please try again or contact support.");
    } finally {
      setIsDeleting(false);
      setCurrentPassword("");
      setDeleteConfirmation("");
    }
  };

  return (
    <div className="bg-gray-100 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden md:flex mt-20 mb-20">
        {/* Left Sidebar */}
        <aside className="w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r">
          <h3 className="text-lg font-semibold text-indigo-600 mb-4">Account Settings</h3>
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab("password")}
              className={`w-full text-left py-2 px-4 rounded-md hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center ${
                activeTab === "password" ? "bg-gray-200 font-semibold text-indigo-600" : "text-gray-600"
              }`}
            >
              <LockClosedIcon className="w-5 h-5 mr-2" aria-hidden="true" />
              Change Password
            </button>
            <button
              onClick={() => setActiveTab("delete")}
              className={`w-full text-left py-2 px-4 rounded-md hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center ${
                activeTab === "delete" ? "bg-gray-200 font-semibold text-red-600" : "text-red-500"
              }`}
            >
              <TrashIcon className="w-5 h-5 mr-2" aria-hidden="true" />
              Delete Account
            </button>
            {/* You can add more options here with their respective icons */}
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="w-full md:w-2/3 p-8">
          {activeTab === "password" && (
            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-4">
                Change Password
              </h3>
              {userHasPassword() ? (
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="currentPassword"
                      className="block text-sm font-medium text-gray-600"
                    >
                      Current Password
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="newPassword"
                      className="block text-sm font-medium text-gray-600"
                    >
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    className="mt-6 border bg-white border-[#4A3AFF] text-[#4A3AFF] py-2 px-5 rounded h-[40px] flex items-center justify-center hover:bg-[#F0EDFF] hover:cursor-pointer hover:text-[#6357FF] transition-colors duration-200 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Change Password"}
                  </Button>
                </div>
              ) : (
                <p className="text-gray-600">
                  Password change is not available for your login method.
                </p>
              )}
            </div>
          )}

          {activeTab === "delete" && (
            <div>
              <h3 className="text-xl font-semibold text-red-600 mb-4">
                Delete Account
              </h3>
              <p className="text-gray-600 mb-4">
                Warning: This action is irreversible. Once your account is
                deleted, all your data will be permanently lost.
              </p>
              <div className="space-y-4">
                {userHasPassword() && (
                  <div>
                    <Label
                      htmlFor="currentPasswordDelete"
                      className="block text-sm font-medium text-gray-600"
                    >
                      Current Password
                    </Label>
                    <Input
                      id="currentPasswordDelete"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                    />
                  </div>
                )}
                <div>
                  <Label
                    htmlFor="deleteConfirmation"
                    className="block text-sm font-medium text-gray-600"
                  >
                    Confirm Deletion
                  </Label>
                  <Input
                    id="deleteConfirmation"
                    type="text"
                    placeholder="Type 'delete' to confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  />
                </div>
                <Button
                  onClick={handleDeleteAccount}
                  className="inline-flex items-center rounded-md border bg-white border-red-500 text-red-500 py-2 px-5 rounded h-[40px] flex items-center justify-center hover:bg-red-50 hover:cursor-pointer hover:text-red-600 transition-colors duration-200 disabled:opacity-50"
                  disabled={isDeleting || loading}
                >
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </Button>
              </div>
            </div>
          )}

          {/* You can add more content sections here for other settings options */}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;