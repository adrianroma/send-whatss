import { ChatWidget } from "@/components/chat-widget";
import { ProductStore } from "@/components/product-store";

export default function Home() {
  return (
    <>
      <ProductStore />
      <ChatWidget />
    </>
  );
}
