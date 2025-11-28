const PageContainer = ({ 
  children, 
  variant = "default",
  maxWidth = "7xl",
  className = "",
  background = true
}) => {
  const variants = {
    default: "py-8 px-4 sm:px-6 lg:px-8",
    hero: "py-16 px-4 sm:px-6 lg:px-8",
    compact: "py-4 px-4 sm:px-6 lg:px-8",
    spacious: "py-12 px-4 sm:px-6 lg:px-8"
  };

  const maxWidths = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-5xl",
    xl: "max-w-6xl",
    "7xl": "max-w-7xl",
    full: "max-w-full"
  };

  return (
    <div className="relative min-h-screen">
      {/* Background disabled for minimal look */}
      {background && <div className="fixed inset-0 -z-10 bg-base-100" />}

      {/* Content Container */}
      <div className={`${variants[variant]} ${maxWidths[maxWidth]} mx-auto ${className}`}>
        {children}
      </div>
    </div>
  );
};

// Card Container variant for content sections
export const ContentCard = ({ 
  children, 
  title = null,
  subtitle = null,
  className = "",
  hoverable = false
}) => {
  return (
    <div 
      className={`
        relative p-6 sm:p-8 rounded-2xl 
        bg-base-200 
        border border-base-200 
        shadow-sm
        ${hoverable ? "hover:border-base-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" : ""}
        ${className}
      `}
    >
      {/* Glow effect on hover */}
      {hoverable && (
        <div className="absolute inset-0 rounded-2xl bg-base-200/60 group-hover:bg-base-300 transition-all duration-200 -z-10" />
      )}

      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-2xl sm:text-3xl font-bold text-base-content mb-2">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-base-content/70">{subtitle}</p>
          )}
        </div>
      )}
      
      {children}
    </div>
  );
};

// Grid Container for layouts
export const GridContainer = ({ 
  children, 
  columns = 3,
  gap = 6,
  className = ""
}) => {
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  };

  const gapClasses = {
    2: "gap-2",
    4: "gap-4",
    6: "gap-6",
    8: "gap-8"
  };

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

// Section Container with dividers
export const Section = ({ 
  children, 
  title = null,
  id = null,
  className = ""
}) => {
  return (
    <section id={id} className={`py-12 sm:py-16 ${className}`}>
      {title && (
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-base-content mb-4 text-center">
            {title}
          </h2>
          <div className="h-1 w-20 bg-primary/20 rounded-full mx-auto" />
        </div>
      )}
      {children}
    </section>
  );
};

export default PageContainer;
