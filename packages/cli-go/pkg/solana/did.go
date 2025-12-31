package solana

import (
	"github.com/gagliardetto/solana-go"
)

const (
	// DID PDA seed
	DIDSeed = "did_document"
)

// DeriveDIDPDA derives the PDA for a DID document
func DeriveDIDPDA(programID solana.PublicKey, controller solana.PublicKey) (solana.PublicKey, uint8, error) {
	seeds := [][]byte{
		[]byte(DIDSeed),
		controller.Bytes(),
	}

	pda, bump, err := solana.FindProgramAddress(seeds, programID)
	if err != nil {
		return solana.PublicKey{}, 0, err
	}

	return pda, bump, nil
}
