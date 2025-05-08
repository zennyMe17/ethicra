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
      linkedin: "https://www.linkedin.com/in/hemanth-s-b239b02b3",
      instagram: "https://www.instagram.com/hemanth_go_w_da?utm_source=qr&igsh=MWhrMHBldnVxcW94YQ==",
      email: "gowda.hemanth.1718@gmail.com",
    },
    {
      id: 2,
      name: "Maralingeshwar",
      image: "/images/Maralingeshwar.jpeg",
      roles: ["Web Designer", "ML Innovation Specialist"], 
      linkedin: "https://www.linkedin.com/in/marlingeshwar26",
      instagram: "https://www.instagram.com/marlingeshwar?igsh=MXI0aTg1NWk2bTd0Zw==",
      email: "marlingeshwar2003@gmail.com",
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
