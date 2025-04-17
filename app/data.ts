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
    roles: ["Lead Web Developer", "Machine Learning Lead"], // Added two roles
    linkedin: "",
    instagram: "",
    email: "",
  },
  {
    id: 2,
    name: "Maralingeshwar",
    image: "/images/Maralingeshwar.jpeg",
    roles: ["Web Designer", "ML Innovation Specialist"], // Added two roles
    linkedin: "",
    instagram: "",
    email: "",
  },
  {
    id: 3,
    name: "Rajath",
    image: "/images/Rajath.jpeg",
    roles: ["Product Designer", "ML Team Member"], // Added two roles
    linkedin: "",
    instagram: "",
    email: "",
  },
  {
    id: 4,
    name: "Mohammad Kaif",
    image: "/images/Kaif.jpeg",
    roles: ["Website Team Member", "Product Designer"], // Added two roles
    linkedin: "",
    instagram: "",
    email: "",
  },
];

export default teamData;