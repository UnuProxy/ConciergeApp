// Utility to draw elegant luxury monograms in jsPDF
// Replaces "silly" icons with sophisticated typography-based badges (Hotel/Luxury Brand style)

export const drawServiceIcon = (doc, x, y, width, height, category) => {
  const cx = x + width / 2;
  const cy = y + height / 2;
  
  // Luxury Palette
  const palette = {
    gold: [180, 160, 120],       // Primary Gold
    goldLight: [230, 220, 200],  // Soft Gold for fills
    navy: [32, 32, 64],          // Deep Navy
    offWhite: [252, 252, 254],   // Almost white
    text: [60, 60, 70],          // Charcoal
    
    // Category specific accents (Subtle backgrounds)
    accents: {
      villas: [235, 240, 235],    // Sage Mist
      boats: [235, 240, 250],     // Marine Mist
      cars: [240, 240, 245],      // Slate Mist
      chefs: [250, 235, 235],     // Rose Mist
      security: [235, 235, 245],  // Cool Mist
      default: [245, 247, 250]    // Gray Mist
    }
  };

  // Map categories to Monogram data
  const getMonogramData = (cat) => {
    switch (cat) {
      case 'villas':
      case 'property':
        return { letter: 'V', label: 'VILLA', color: palette.accents.villas };
      case 'boats':
      case 'yachts':
        return { letter: 'Y', label: 'YACHT', color: palette.accents.boats };
      case 'cars':
        return { letter: 'C', label: 'CHAUFFEUR', color: palette.accents.cars };
      case 'chefs':
      case 'chef':
        return { letter: 'C', label: 'CHEF', color: palette.accents.chefs };
      case 'security':
        return { letter: 'S', label: 'SECURITY', color: palette.accents.security };
      case 'nannies':
      case 'kids':
        return { letter: 'N', label: 'NANNY', color: palette.accents.default };
      case 'excursions':
      case 'tours':
        return { letter: 'E', label: 'EXPERIENCE', color: palette.accents.default };
      case 'concierge-core':
      case 'vip':
        return { letter: 'K', label: 'CONCIERGE', color: palette.accents.default }; // K for Key/Concierge
      default:
        return { letter: (cat || 'S').charAt(0).toUpperCase(), label: 'SERVICE', color: palette.accents.default };
    }
  };

  const { letter, label, color } = getMonogramData(category);

  doc.saveGraphicsState();
  
  // 1. Draw The Medallion
  const radius = Math.min(width, height) * 0.45;
  
  // Outer Gold Ring (Thin)
  doc.setDrawColor(...palette.gold);
  doc.setLineWidth(0.2);
  doc.setFillColor(...palette.offWhite);
  doc.circle(cx, cy, radius, 'FD');
  
  // Inner Color Ring (Thicker, Subtle)
  doc.setDrawColor(...color); // Use the accent color for the ring
  doc.setLineWidth(1.5);
  doc.circle(cx, cy, radius * 0.85, 'S');
  
  // 2. Typography - Just the label centered in the circle
  
  // Label centered in the medallion
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...palette.navy); // Navy text for elegance
  
  // Add letter spacing for luxury feel
  const spacedLabel = label.split('').join(' ');
  doc.text(spacedLabel, cx, cy + 1, { align: 'center' });

  doc.restoreGraphicsState();
};
