import { useState, useCallback, useEffect } from 'react';
import { AUTOPLAY_INTERVAL, testimonialsData } from '../data/home/testimonialsData';

export function useTestimonialsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? testimonialsData.length - 1 : prevIndex - 1
    );
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === testimonialsData.length - 1 ? 0 : prevIndex + 1
    );
  }, []);

  useEffect(() => {
    if (testimonialsData.length <= 1) return;

    const timer = setInterval(() => {
      goToNext();
    }, AUTOPLAY_INTERVAL);

    return () => clearInterval(timer);
  }, [goToNext]);

  const currentTestimonial = testimonialsData[currentIndex];

  return {
    currentTestimonial,
    goToPrevious,
    goToNext,
    hasMultiple: testimonialsData.length > 1,
  };
}
