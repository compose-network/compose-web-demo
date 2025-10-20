import { Text } from "@/components/ui/text";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
  isOpen: boolean;
}

const Faq = () => {
  const [faqItems, setFaqItems] = useState<FaqItem[]>([
    {
      question: "What is Compose?",
      answer: "Compose Network unites Ethereum rollups to enable instant and composable transactions, where actions across rollups can happen together in a single atomic flow. It's powered by a Shared Publisher, a coordination layer that allows rollups to execute operations synchronously while each maintains its own sequencing and independence.",
      isOpen: false
    },
    {
      question: "What does this demo do?",
      answer: "This demo webapp lets you interact and experiment with synchronous composability across two testnet rollups. You'll explore two key use cases, cross-rollup bridging and cross-rollup swaps, to see how Compose enables transactions that either succeed together or revert together.",
      isOpen: false
    },
    {
      question: "How do I onboard to the Compose testnet?",
      answer: "Start by bridging ETH from Ethereum's Hoodi testnet to one of the Compose demo rollups. Choose how much ETH to bridge and where to receive it — this is your entry point into the Compose ecosystem.",
      isOpen: false
    },
    {
      question: "What are Rollup A and Rollup B?",
      answer: "They're testnet rollups deployed by the Compose team to showcase the protocol in action. Both are fully composable with each other — meaning you can bridge and swap tokens between them in synchronous, instant transactions using Compose.",
      isOpen: false
    },
    {
      question: "Why do I need to sign messages, and why are they shown as hex?",
      answer: "Compose uses Smart Accounts, a form of account abstraction that allows you to perform multiple actions — like swaps or instant bridges — in one synchronous, composable transaction. When you sign a message, you're authorizing your Smart Account to execute the operation. The message is displayed in hex format because it encodes all contract calls into a single bundled operation. Future versions will make this more human-readable.",
      isOpen: false
    },
    {
      question: "Why do I sometimes need to transfer ETH to my Smart Account?",
      answer: "ETH isn't an ERC-20 token, so it can't be approved for spending like other assets. Before certain actions, you'll be prompted to transfer ETH into your Smart Account so it can be used to complete synchronous cross-rollup operations such as instant bridging or swaps.",
      isOpen: false
    }
  ]);

  const toggleFaq = (index: number) => {
    setFaqItems(prev => prev.map((item, i) =>
      i === index ? { ...item, isOpen: !item.isOpen } : item
    ));
  };

  return (
    <div className="mt-6 p-8 w-[648px] bg-white rounded-[40px] mb-8">
      <Text className="text-gray-500 mb-6" variant={'headline4'}>FAQ</Text>

      <div className="space-y-4">
        {faqItems.map((item, index) => (
          <div key={index} className="bg-white rounded-[20px] overflow-hidden">
            <button
              onClick={() => toggleFaq(index)}
              className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
            >
              <Text className="font-semibold text-gray-800">{item.question}</Text>
              <div>
                {item.isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </button>

            {item.isOpen && (
              <div className="px-4 pb-4">
                <Text className="text-gray-600 text-sm leading-relaxed">
                  {item.answer}
                </Text>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Faq;