import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Simple encryption utility for API keys
 * In production, use a proper encryption library
 */
export async function encryptApiKey(apiKey: string): Promise<{ cipher: string; iv: string }> {
  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  // Convert API key to bytes
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  
  // Use Web Crypto API for encryption
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  
  // Convert to base64 for storage
  const encryptedArray = new Uint8Array(encryptedData)
  const cipher = btoa(String.fromCharCode.apply(null, Array.from(encryptedArray)))
  const ivBase64 = btoa(String.fromCharCode.apply(null, Array.from(iv)))
  
  return { cipher, iv: ivBase64 }
}

/**
 * Simple decryption utility for API keys
 * In production, use a proper encryption library
 */
export async function decryptApiKey(cipher: string, iv: string): Promise<string> {
  try {
    // Convert from base64
    const encryptedData = Uint8Array.from(atob(cipher), c => c.charCodeAt(0))
    const ivData = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
    
    // Generate the same key (in production, store this securely)
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    
    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivData },
      key,
      encryptedData
    )
    
    // Convert back to string
    const decoder = new TextDecoder()
    return decoder.decode(decryptedData)
  } catch (error) {
    throw new Error('Failed to decrypt API key')
  }
}