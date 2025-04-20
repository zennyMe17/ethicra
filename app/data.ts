// data.ts
export interface TeamMember {
    id: number;
    name: string;
    image: string;
    roles: string[]; // Changed role to roles (array of strings)
    linkedin: string;
    instagram: string;
    email: string;
  }
  
  const teamData: TeamMember[] = [
    {
      id: 1,
      name: "Hemanth",
      image: "/images/Hemanth.jpeg",
      roles: ["Lead Web Developer", "Machine Learning Lead"], 
      linkedin: "",
      instagram: "",
      email: "",
    },
    {
      id: 2,
      name: "Maralingeshwar",
      image: "/images/Maralingeshwar.jpeg",
      roles: ["Web Designer", "ML Innovation Specialist"], 
      linkedin: "",
      instagram: "",
      email: "",
    },
    {
      id: 3,
      name: "Rajath",
      image: "/images/Rajath.jpeg",
      roles: ["Web Designer", " Lead ML Developer"], 
      linkedin: "https://www.linkedin.com/in/rajath-u",
      instagram: "https://www.instagram.com/rajathu_17?igsh=MXgzZTBmdmYwdGxwbQ==",
      email: "rajath17@yahoo.com",
    },
    {
      id: 4,
      name: "Mohammad Kaif",
      image: "/images/Kaif.jpeg",
      roles: ["Website Team Member", "Product Designer"],
      linkedin: "https://www.linkedin.com/in/mohammad-kaif-7aab0b228?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
      instagram: "",
      email: "kaif78618@gmail.com",
    },
  ];
  
  export default teamData;