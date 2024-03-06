import React, { useCallback, useEffect, useState, useRef, type PropsWithChildren } from "react";
import { cn } from "../utils/cn";

type Props = {
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
} & PropsWithChildren;

export const InfiniteMovingCards: React.FC<Props> = ({
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const updateAnimationState = useCallback(() => {
    if (containerRef.current && scrollerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      console.log(containerWidth);
      const childrenWidth = Array.from(scrollerRef.current.children).reduce((total, child) => {
        console.log(child.clientWidth);
        return total + child.clientWidth;
      }, 0);

      // Check if the children's combined width exceeds the container's width
      if (childrenWidth > containerWidth) {
        setShouldAnimate(true);
      } else {
        setShouldAnimate(false);
      }
    }
  }, []);

  useEffect(() => {
    updateAnimationState();
    // Re-check on window resize
    window.addEventListener("resize", updateAnimationState);
    return () => {
      window.removeEventListener("resize", updateAnimationState);
    };
  }, [updateAnimationState]);

  useEffect(() => {
    if (shouldAnimate && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);
      for (const item of scrollerContent) {
        const duplicatedItem = item.cloneNode(true);
        scrollerRef.current.appendChild(duplicatedItem);
      }
    }
  }, [shouldAnimate]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    let resizeObserver: ResizeObserver | null = null;

    if (scroller) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target.offsetWidth > 0) {
            // Now you have a non-zero width
            setShouldAnimate(true);
          } else {
            setShouldAnimate(false);
          }
        }
      });

      resizeObserver.observe(scroller);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []); // Empty dependency array ensures this runs once after initial render

  const getDirection = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty(
        "--animation-direction",
        direction === "left" ? "normal" : "reverse"
      );
    }
  }, [direction]);

  const getSpeed = useCallback(() => {
    if (containerRef.current) {
      const speedMap = { fast: "15s", normal: "40s", slow: "80s" };
      const key = speed;
      containerRef.current.style.setProperty("--animation-duration", speedMap[key]);
    }
  }, [speed]);

  useEffect(() => {
    if (shouldAnimate) {
      getDirection();
      getSpeed();
    }
  }, [shouldAnimate, getDirection, getSpeed]);

  return (
    <div
      ref={containerRef}
      className={cn("scroller relative max-w-7xl overflow-hidden", className)}>
      <ul
        ref={scrollerRef}
        className={cn(
          "flex min-w-full shrink-0 gap-20 py-0 flex-nowrap overflow-hidden",
          shouldAnimate && "animate-scroll",
          pauseOnHover && "hover:pause-animation"
        )}>
        {children}
      </ul>
    </div>
  );
};
