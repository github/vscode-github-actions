import libsodium from 'libsodium-wrappers'
import {encodeSecret} from './index'

describe('secret encryption', () => {
  it('encrypts secret correctly', async () => {
    await libsodium.ready

    // The keys were generated for this test using libsodium.crypto_box_keypair()
    const publicKey = 'M2Kq4k1y9DiqlqLfm2YYm75x5M3SuwuNYbLyiHEMUAM='
    const privateKey = 'RI2kKSjSOBmcjme5x8iv42Ozdu1rDo9QkaU2l+IFcrE='

    const a = await encodeSecret(publicKey, 'secret-value')

    const da = libsodium.crypto_box_seal_open(
      libsodium.from_base64(a, libsodium.base64_variants.ORIGINAL),
      libsodium.from_base64(publicKey, libsodium.base64_variants.ORIGINAL),
      libsodium.from_base64(privateKey, libsodium.base64_variants.ORIGINAL),
    )
    expect(libsodium.to_string(da)).toBe('secret-value')
  })
})
