export interface Passenger {
  id: string;
  name: string;
  title: string;
}

export const passengers: Passenger[] = [
  { id: "VD", name: "Vidmantas Daugvila", title: "Mr." },
  { id: "VVD", name: "Vaida Vaitkeviciute-Daugvile", title: "Mrs." },
  { id: "PD", name: "Patricija Daugvilaite", title: "Ms." },
  { id: "BD", name: "Beatrice Daugvilaite", title: "Ms." },
];

export function searchPassengers(query: string): Passenger[] {
  if (!query) return passengers;
  
  const searchTerm = query.toLowerCase().trim();
  
  // Score and filter passengers
  const scoredPassengers = passengers
    .map(passenger => {
      let score = 0;
      const fullName = passenger.name.toLowerCase();
      const title = passenger.title.toLowerCase();
      
      // Exact matches get highest scores
      if (fullName === searchTerm) score += 100;
      if (title + " " + fullName === searchTerm) score += 100;
      
      // Name matches
      if (fullName.startsWith(searchTerm)) score += 80;
      if (fullName.includes(searchTerm)) score += 60;
      
      // Title matches
      if ((title + " " + fullName).startsWith(searchTerm)) score += 70;
      
      // Word boundary matches get bonus points
      const words = fullName.split(' ');
      if (words.some(word => word.startsWith(searchTerm))) score += 40;
      
      return { passenger, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ passenger }) => passenger);

  return scoredPassengers;
} 