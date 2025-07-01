// Encryption

pub struct EncryptionKey {
    key: Vec<u8>,
}

impl EncryptionKey {
    pub fn new(key: Vec<u8>) -> Self {
        Self { key }
    }

    pub fn generate() -> Self {
        // TODO: Implement key generation
        Self::new(vec![0u8; 32])
    }

    pub fn encrypt(&self, _data: &[u8]) -> Vec<u8> {
        // TODO: Implement encryption
        Vec::new()
    }

    pub fn decrypt(&self, _data: &[u8]) -> Vec<u8> {
        // TODO: Implement decryption
        Vec::new()
    }
}
