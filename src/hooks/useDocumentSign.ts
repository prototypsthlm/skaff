import { Linking } from 'react-native'
import { User } from '../data/user'

type CreateNewDocument = () => Promise<string>

type UpdateDocument = (
  documentId: string,
  title: string,
  parties: User[]
) => Promise<Document>

type StartDocument = (documentId: string) => Promise<Document>

type SignDocument = (party: SigningParty) => Promise<void>

type PartyField = {
  type: string
  value: string
}

type SigningParty = {
  name: string
  email: string
  api_delivery_url: string
  signatory_role: string
  delivery_method: string
  sign_success_redirect_url: string
  fields: PartyField[]
}

type Document = {
  id: string
  title: string
  parties: SigningParty[]
}

const useDocumentSign = (): [
  CreateNewDocument,
  UpdateDocument,
  StartDocument,
  SignDocument
] => {
  const API_URL = process.env.EXPO_PUBLIC_SCRIVE_API_URL

  /// Construct the headers for the API calls
  const makeHeaders = () => {
    const headers = new Headers()
    const oauthKey = process.env.EXPO_PUBLIC_SCRIVE_OAUTH_KEY
    const oauthToken = process.env.EXPO_PUBLIC_SCRIVE_OAUTH_TOKEN
    const oauthSignature = process.env.EXPO_PUBLIC_SCRIVE_OAUTH_SIGNATURE

    const authHeader = `oauth_signature_method="PLAINTEXT", oauth_consumer_key="${oauthKey}", oauth_token="${oauthToken}", oauth_signature="${oauthSignature}"`

    headers.append('Authorization', authHeader)

    headers.append('Cookie', 'lang="en"; lang-ssn="en"')

    return headers
  }

  /// Creates a new document from a template
  const createNewFromTemplate = async () => {
    const headers = makeHeaders()

    const newDocument = await fetch(
      `${API_URL}/api/v2/documents/newfromtemplate/8222115557379372352`,
      {
        method: 'POST',
        headers: headers,
        redirect: 'follow',
      }
    )

    const data = await newDocument.json()
    const documentId = data.id
    return documentId
  }

  /// Prepares the document for signing
  const startNewDocument = async (documentId: string) => {
    const headers = makeHeaders()

    const newDocument = await fetch(
      `${API_URL}/api/v2/documents/${documentId}/start`,
      {
        method: 'POST',
        headers: headers,
        redirect: 'follow',
      }
    )

    return newDocument.json()
  }

  /// Updates the document with the relevant information about signing parties
  const updateDocument = async (
    documentId: string,
    title: string,
    parties: User[]
  ): Promise<Document> => {
    const headers = makeHeaders()
    const redirectUrl = process.env.EXPO_PUBLIC_SCRIVE_REDIRECT_URL

    const formdata = new FormData()

    const defaultParty = {
      is_signatory: false,
      signatory_role: 'viewer',
      delivery_method: 'api',
      sign_success_redirect_url: redirectUrl,
      fields: [
        {
          type: 'company',
          value: 'Default Party',
          order: 1,
          is_obligatory: true,
        },
      ],
    }

    const partiesData = parties.map((party) => {
      return {
        is_signatory: true,
        signatory_role: 'signing_party',
        delivery_method: 'api',
        sign_success_redirect_url: redirectUrl,
        fields: [
          {
            type: 'company',
            value: party.name,
            order: 1,
            is_obligatory: true,
          },
          {
            type: 'email',
            value: party.email,
            order: 2,
            is_obligatory: true,
          },
        ],
      }
    })

    const documentData = {
      title: title,
      parties: [defaultParty, ...partiesData],
    }

    formdata.append('document', JSON.stringify(documentData))

    const newDocument = await fetch(
      `${API_URL}/api/v2/documents/${documentId}/update`,
      {
        method: 'POST',
        headers: headers,
        body: formdata,
        redirect: 'follow',
      }
    )

    return newDocument.json()
  }

  /// Opens the relevant link for the signing party to sign the document
  const signDocument = async (party: SigningParty) => {
    const signingUrl = party.api_delivery_url
    const url = new URL(signingUrl, API_URL)
    const result = await Linking.openURL(url.href)
  }

  return [createNewFromTemplate, updateDocument, startNewDocument, signDocument]
}

export default useDocumentSign
