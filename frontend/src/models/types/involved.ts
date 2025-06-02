export default interface TeamMember {
  id: number;
  name: string;
  title: string;
  imageSrc: string; // Main image for the grid
  modalImageSrc: string; // Potentially larger/different image for modal
  major: string;
  graduationYear: string;
  hobbies: string;
  whyDTE: string;
  roleInDTE: string;
  funFact: string;
  contact?: string; // Optional contact
}