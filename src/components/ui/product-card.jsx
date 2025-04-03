import { Star } from 'lucide-react'
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"



export default function ProductCard({ name, price, rating, image, item }) {
    return (
        <Card className="w-full overflow-hidden">
            <CardHeader className="p-0">
                <div className="relative h-48 w-full">
                    <Image
                        src={image}
                        alt={name}
                        layout="fill"
                        objectFit="cover"
                        className="transition-transform duration-300 ease-in-out hover:scale-105"
                    />
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <CardTitle className="text-lg font-semibold line-clamp-2">{name}</CardTitle>
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-2xl font-bold">${price.toFixed(2)}</span>
                    <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                className={`h-5 w-5 ${i < Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
                <Button className="w-full" onClick={() => addToCart(item)}
                    disabled={!item.inStock}>Add to Cart</Button>
            </CardFooter>
        </Card>
    )
}

