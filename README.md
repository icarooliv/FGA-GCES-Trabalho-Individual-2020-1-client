# FGA-GCES-Trabalho-Individual-2020-1

Aluno: Ícaro Oliveira
Matrícula: 15/0129807

## Ambientes deployados:

**Client**: http://client.default.206.189.237.72.xip.io/?#/

**API** (com uma query de exemplo): http://api.default.206.189.237.72.xip.io/api/v1/search/?query=icaro

## Métricas CodeClimate:

**API**: https://codeclimate.com/github/icarooliv/FGA-GCES-Trabalho-Individual-2020-1-api

**Client**: https://codeclimate.com/github/icarooliv/FGA-GCES-Trabalho-Individual-2020-1-client

## Como executar a API e Client

Na raiz do respectivo projeto

Crie o arquivo `.env.{development,test}`, com as variáveis fornecidas a partir do `.env.example`.

Depois disso, basta executar o seguinte comando (para ambiente de dev, por exemplo):

``docker-compose --env-file=".env.development" up --build``


* A API estará rodando em: `http://localhost:3091`

* O Client estará rodando em: `http://localhost:3091`

Depois, para executar comandos dentro do container:

Na API:

``docker-compose run api <comando>``

Para rodar os testes, por exemplo:

``docker-compose run api rails test``

No Client:

``docker-compose run client <comando>``

Para rodar os testes, por exemplo:

``docker-compose run client yarn:unit``


## Tecnologias

* Docker 

Para conteinerização dos ambientes e do banco de dados.

* Docker-Compose

Para orquestração dos containers.

* GitHub Actions

Para orquestração das atividades a serem executadas no ambiente de CI/CD.

* DockerHub

Para hospedar as imagens criadas em caso de push na branch `main`

* NGINX

Para servir os arquivos estáticos do Client

* Digital Ocean

Para host do ambiente 

* Code Climate 

Para coleta de métricas de qualidade de código

* SimpleCov e Jest

Para coleta de métricas de cobertura de testes.

## Objetivos

Esse trabalho realizou os seguintes objetivos:

[x] Test a cada push em qualquer branch
[x] Coleta de cobertura de testes a cada push em qualquer branch
[x] Build a cada push em qualquer branch
[x] Push da imagem para o DockerHub a cada push na branch `main`
[x] Deploy da nova imagem no Rancher a cada push na branch `main` (parcial, explicação na sessão de Pipeline CI/CD)

## Contêinerização
### Contextualização

A estratégia escolhida foi utilizar algumas das ferramentas apresentadas durante o curso e utilizadas durante o projeto e que eu tinha curiosidade
de aprender. Nunca havia mexido com Rancher, Digital Ocean nem GitHub CI, então acabei aprendendo bastante :)

* Conteinerização da API:

Para a API, foi criado um Dockerfile apenas, que abrange tanto os ambientes de dev, test e prod. Foi interessante utilizar
o script [docker-compose-wait](https://github.com/ufoscout/docker-compose-wait), que espera pela inicialização total de um container específico
antes de executar outro. O docker-compose dipõe de uma opção `depends-on`, mas essa opção abrange apenas um sinal de que o container está up e não
de que ele está preparado para enviar e receber comunicação.

Esse script foi utilizado para fazer o container da API esperar o container do PostgreSQL estar pronto antes de tentar executar as migrações, o que estava
causando erros no ambiente de produção e local.

* Conteinerização do Client:

Nesse caso, foram feitos dois Dockerfiles, um para dev/test e outro para produção. No caso de SPAs, como o VueJS, o HTML/CSS/JS precisam ser passar por
um empacotamento antes de serem deployados, para minificar o JS, CSS etc e os arquivos estáticos são servidos através de um servidor 
http como o NGINX.

Só que existe um problema, que é: uma vez compilado, o código não recebe mais variáveis de ambiente. Elas devem ser passadas apenas em tempo de build.
E o client precisa de uma variável de ambiente para informar a URL da API que ela se comunica.

Existem duas opções: servir variáveis de ambiente pelo servidor HTTP ou reescrever o header de algum arquivo com um template que pode ser reescrito em
tempo de execução.

Para resolver esse problema, foi escolhida a segunda opção, adicionando o seguinte no Dockerfile.production

```Dockerfile
CMD sed -i -e "s#{{ API_URL }}#$API_URL#g" /usr/share/nginx/html/js/app.*.js && \
    nginx -g "daemon off;"
```

Esse Dockerfile.production também conta com a opção de multistaging, fazendo o estágio de compilação primeiro e depois
de produção, servindo os arquivos compilados via NGINX.

## Pipeline de CI/CD

Inicialmente, o projeto foi desenvolvido utilizando o monorepo fornecido pelos professores. 
Porém, poucas ferramentas de CI oferecem um bom suporte para trabalhar com múltiplos projetos em um só repositório.
Nesse contexto, o GithubCI foi escolhido por oferecer de forma mais simplificada a opção de `working_dir`, que permite que cada job rode
em um path específico do repo.

Ainda assim, ferramentas como o Code Climate não permitem separar as análises por diretório, tornando a análise de código um pouco confusa.

Com a liberação dos professores, os repositórios foram divididos em dois e esses problemas foram mitigados.

O repositório inicial está disponível aqui (https://github.com/icarooliv/Trabalho-Individual-2020-1)

O pipeline para os dois ambientes segue a seguinte lógica:

```
push(*) > Test* > Build
                      \\ apenas branch `main` \\ > Push DockerHub > Redeploy Rancher Workload (desativada) 
```

* O Test gera o artefato de cobertura de testes, com o SimpleCov ou o Jest, na aba artifacts:

![](https://i.imgur.com/eGudA76.png)


O redeploy do ambiente no Rancher com uma nova imagem criada é feita através de uma action no GitHub Actions:

```
  deploy:
    needs: [tests, build]
    if: github.ref == 'refs/heads/branch `main`'
    runs-on: ubuntu-latest
    steps:
      - name: Update rancher deployment
        uses: th0th/rancher-redeploy-workload@v0.82
        env:
          RANCHER_BEARER_TOKEN: '${{ secrets.RANCHER_BEARER_TOKEN }}'
          RANCHER_CLUSTER_ID: '${{ secrets.RANCHER_CLUSTER_ID }}'
          RANCHER_NAMESPACE: '${{ secrets.RANCHER_NAMESPACE }}'
          RANCHER_PROJECT_ID: '${{ secrets.RANCHER_PROJECT_ID }}'
          RANCHER_URL: '${{ secrets.RANCHER_URL }}'
          RANCHER_WORKLOADS: '${{ secrets.RANCHER_WORKLOADS }}' 
```

Esse comando indica para o Rancher buscar a imagem com tag `:latest`no repositório do DockerHub indica

![rancher-config](https://i.imgur.com/36aPdSr.png)

Porém, para essa action funcionar corretamente é necessário de um certificado SSL para endereço do ambiente do Rancher, o que decidi
não fazer. Caso o certificado não exista, a action acusa o erro a seguir e por isso foi desativada no pipeline.

![erro-ssl](https://i.imgur.com/0lpzHVf.png)

Dessa forma, o redeploy do ambiente precisa ser feito manualmente pela interface do Rancher.
