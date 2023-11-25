import React from 'react'
import Header from '~/components/Header'
import { useUser } from '~/utils'

const Welcome = () => {
    const user = useUser();
  return (
    <main>
        <Header email={user.email} />
        <section>
            <h1>Welcome</h1>
        </section>
    </main>
  )
}

export default Welcome;