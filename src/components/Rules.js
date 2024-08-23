// rule me!
const RulesComponent = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white text-black p-8 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Chat Rules and Guidelines</h2>
        <ul className="list-disc list-inside mb-6 space-y-2">
          <li>Be respectful and kind to all chat partners.</li>
          <li>Do not engage in or promote any illegal activities.</li>
          <li>Avoid sharing personal information that could compromise your safety.</li>
          <li>Do not use hate speech, discriminatory language, or engage in harassment.</li>
          <li>Refrain from explicit sexual content or nudity.</li>
          <li>Do not spam or advertise products or services.</li>
          <li>Report any users who violate these rules or make you feel uncomfortable.</li>
          <li>Respect others' privacy and do not record or share conversations without consent.</li>
          <li>Be mindful of cultural differences and sensitivities.</li>
          <li>Have fun and enjoy meaningful conversations!</li>
        </ul>
        <p className="mb-4">
          Violation of these rules may result in temporary or permanent suspension from the platform.
          We reserve the right to modify these rules at any time. Continued use of the service implies
          acceptance of any updated rules.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );

  export default RulesComponent