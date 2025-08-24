// This is a test component to verify responsive design
// Remove this file after testing

function ResponsiveTest() {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Responsive Design Test</h1>
      
      {/* Grid Test */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Grid Responsiveness</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-blue-100 p-4 rounded text-center">
              Item {i}
            </div>
          ))}
        </div>
      </div>
      
      {/* Typography Test */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Typography Responsiveness</h2>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
          Responsive Heading
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-gray-600">
          This paragraph adjusts its size based on screen size.
        </p>
      </div>
      
      {/* Button Test */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Button Responsiveness</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Primary Button
          </button>
          <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded">
            Secondary Button
          </button>
        </div>
      </div>
      
      {/* Card Test */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Card Layout</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-lg shadow border">
              <h3 className="font-semibold mb-2">Card {i}</h3>
              <p className="text-gray-600 text-sm">
                This card adapts to different screen sizes.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ResponsiveTest